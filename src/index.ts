import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

type DateExtractor = {
  name: string;
  regex: RegExp;
  toISODate: (match: RegExpExecArray) => string | null; // YYYY-MM-DD
};

// Common date patterns in logs
const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
];

const extractors: DateExtractor[] = [
  {
    name: 'iso-8601',
    // 2025-08-29T14:23:45 or 2025-08-29 14:23:45 or just 2025-08-29
    regex: /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
    toISODate: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    name: 'yyyy/mm/dd',
    regex: /(\d{4})\/(\d{2})\/(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
    toISODate: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    name: 'dd/mm/yyyy',
    regex: /(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
    toISODate: (m) => `${m[3]}-${m[2]}-${m[1]}`,
  },
  {
    name: 'dd-mon-yyyy',
    // 29-Aug-2025 or 29-Aug-2025 14:23:45
    regex: /(\d{2})-([A-Za-z]{3})-(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
    toISODate: (m) => {
      const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
      if (mon === -1) return null;
      const mm = String(mon + 1).padStart(2, '0');
      return `${m[3]}-${mm}-${m[1]}`;
    },
  },
  {
    name: 'mon dd, yyyy',
    // Aug 29, 2025 14:23:45
    regex: /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/,
    toISODate: (m) => {
      const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
      if (mon === -1) return null;
      const dd = String(parseInt(m[2], 10)).padStart(2, '0');
      const mm = String(mon + 1).padStart(2, '0');
      return `${m[3]}-${mm}-${dd}`;
    },
  },
  {
    name: 'syslog-mon dd hh:mm:ss',
    // Aug 29 14:23:45 (no year). Assume current year.
    regex: /\b([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\b/,
    toISODate: (m) => {
      const nowYear = new Date().getFullYear();
      const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
      if (mon === -1) return null;
      const dd = String(parseInt(m[2], 10)).padStart(2, '0');
      const mm = String(mon + 1).padStart(2, '0');
      return `${nowYear}-${mm}-${dd}`;
    },
  },
];

type CliOptions = {
  inputDir: string;
  outputDir: string;
  maxSampleLines: number;
  unknownBucket: string;
};

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = {
    inputDir: 'input',
    outputDir: 'output',
    maxSampleLines: 500,
    unknownBucket: 'unknown',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && i + 1 < argv.length) out.inputDir = argv[++i];
    else if (a === '--output' && i + 1 < argv.length) out.outputDir = argv[++i];
    else if (a === '--max-sample-lines' && i + 1 < argv.length) out.maxSampleLines = parseInt(argv[++i], 10);
    else if (a === '--unknown-bucket' && i + 1 < argv.length) out.unknownBucket = argv[++i];
  }
  return out;
}

async function sampleLines(filePath: string, maxLines: number, maxBytes = 256 * 1024): Promise<string[]> {
  const lines: string[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let bytes = 0;
  try {
    for await (const line of rl) {
      lines.push(line as string);
      bytes += Buffer.byteLength(line as string);
      if (lines.length >= maxLines || bytes >= maxBytes) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return lines;
}

function chooseExtractor(lines: string[]): DateExtractor | null {
  const counts = new Map<string, number>();
  for (const ex of extractors) counts.set(ex.name, 0);
  for (const line of lines) {
    for (const ex of extractors) {
      if (ex.regex.exec(line)) counts.set(ex.name, (counts.get(ex.name) || 0) + 1);
    }
  }
  let best: DateExtractor | null = null;
  let bestCount = 0;
  for (const ex of extractors) {
    const c = counts.get(ex.name) || 0;
    if (c > bestCount) {
      best = ex;
      bestCount = c;
    }
  }
  // Require a minimal confidence (>=3 matches) unless there are very few lines
  if (best && (bestCount >= 3 || lines.length <= 10)) return best;
  return bestCount > 0 ? best : null;
}

function extractDate(line: string, ex: DateExtractor | null): string | null {
  if (ex) {
    const m = ex.regex.exec(line);
    if (m) return ex.toISODate(m) ?? null;
  }
  // Fallback: loose ISO-like date anywhere
  const loose = /(\d{4})[-/](\d{2})[-/](\d{2})/.exec(line);
  if (loose) return `${loose[1]}-${loose[2]}-${loose[3]}`;
  return null;
}

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function safeOutName(base: string, day: string) {
  const ext = path.extname(base);
  const name = path.basename(base, ext);
  const cleanExt = ext && ext !== '.' ? ext : '.log';
  return `${name}.${day}${cleanExt}`;
}

async function splitFileByDay(filePath: string, outDir: string, opts: { ex: DateExtractor | null; unknownBucket: string }) {
  await ensureDir(outDir);
  const base = path.basename(filePath);
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 128 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const writers = new Map<string, fs.WriteStream>();
  const getWriter = (day: string) => {
    const key = day;
    let w = writers.get(key);
    if (!w) {
      const outPath = path.join(outDir, safeOutName(base, key));
      w = fs.createWriteStream(outPath, { flags: 'a' });
      writers.set(key, w);
    }
    return w;
  };

  let lastDay: string | null = null;
  let count = 0;
  try {
    for await (const line of rl) {
      const day = extractDate(line as string, opts.ex) || lastDay || opts.unknownBucket;
      getWriter(day).write(String(line) + '\n');
      lastDay = extractDate(line as string, opts.ex) || lastDay;
      count++;
      if (count % 200000 === 0) {
        // Periodically flush to keep file descriptors happy on long runs
        for (const w of writers.values()) w.cork();
        for (const w of writers.values()) w.uncork();
      }
    }
  } finally {
    rl.close();
    stream.destroy();
    await new Promise<void>((resolve) => {
      let pending = writers.size;
      if (pending === 0) return resolve();
      for (const w of writers.values()) {
        w.end(() => {
          pending--;
          if (pending === 0) resolve();
        });
      }
    });
  }
}

async function processAll(inputDir: string, outputDir: string, maxSampleLines: number, unknownBucket: string) {
  const entries = await fs.promises.readdir(inputDir, { withFileTypes: true }).catch((e) => {
    if (e && e.code === 'ENOENT') return [] as fs.Dirent[];
    throw e;
  });
  const files = entries.filter((d) => d.isFile()).map((d) => path.join(inputDir, d.name));
  if (files.length === 0) {
    console.log(`No files found in ${inputDir}`);
    return;
  }
  for (const file of files) {
    console.log(`\n>>> Processing: ${file}`);
    const lines = await sampleLines(file, maxSampleLines);
    const ex = chooseExtractor(lines);
    console.log(`Detector: ${ex ? ex.name : 'none/fallback'}`);
    await splitFileByDay(file, outputDir, { ex, unknownBucket });
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  await ensureDir(opts.inputDir);
  await ensureDir(opts.outputDir);
  await processAll(opts.inputDir, opts.outputDir, opts.maxSampleLines, opts.unknownBucket);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


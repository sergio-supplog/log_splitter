# Log Spitter

Split very large log files in `input/` into per‑day files in `output/`.

- Detects date formats by sampling the first lines of each file
- Streams line‑by‑line to handle very large files efficiently
- Writes `basename.YYYY-MM-DD.log` under `output/`

## Usage

- Put source logs in `input/` (kept in git via `.gitkeep`, contents ignored)
- Run in dev: `npm run dev -- --input input --output output`
- Build: `npm run build`
- Run built CLI: `npm start -- --input input --output output`

### CLI options

- `--input <dir>`: Input directory (default `input`)
- `--output <dir>`: Output directory (default `output`)
- `--max-sample-lines <n>`: Lines to sample for date detection (default 500)
- `--unknown-bucket <name>`: Filename suffix for lines with unknown date (default `unknown`)

### Notes

- Only folders `input/` and `output/` are tracked; contents are ignored.
- Date detection supports common formats (ISO, `YYYY/MM/DD`, `DD/MM/YYYY`, syslog‑like, etc.).
- If a line has no date, the splitter uses the last seen date; otherwise writes to the `unknown` file.


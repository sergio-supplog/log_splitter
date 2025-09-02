import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { consola } from 'consola';
import { defineCommand, runMain } from 'citty';

// 
// ==== Main Function =================================================================================================
// 
const command = defineCommand({
  args: {
    lines: {
      type: 'number',
      description: 'Number of lines to extract from each log file',
      alias: 'l'
    }
  },
  async run({ args }) {
    let numLines = args.lines;
    if (!numLines) {
      numLines = await consola.prompt('Enter the number of lines to extract:', { type: 'number' });
    }

    const inputDir = './input';
    const outputDir = './output';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    try {
      const files = await fs.promises.readdir(inputDir);
      const logFiles = files.filter(file => file.endsWith('.log'));

      for (const file of logFiles) {
        consola.info(`Processing ${file}...`);
        await processLogFile(file, numLines);
        consola.success(`Finished processing ${file}.`);
      }

      consola.success('All log files processed.');
    } catch (error) {
      consola.error('Error reading input directory:', error);
    }
  }
});

runMain(command);

//
// ==== Helper Functions ==============================================================================================
//

/**
 * Processes a single log file by reading the first N lines and saving them to the output directory.
 * @param {string} fileName - The name of the log file to process.
 * @param {number} maxLines - The number of lines to extract.
 */
async function processLogFile(fileName, maxLines) {
  const inputPath = path.join('./input', fileName);
  const outputPath = path.join('./output', fileName);

  const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const writeStream = fs.createWriteStream(outputPath);

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;

  try {
    for await (const line of rl) {
      if (lineCount >= maxLines) {
        break;
      }
      writeStream.write(line + '\n');
      lineCount++;
    }
  } catch (error) {
    consola.error(`Error processing file ${fileName}:`, error);
  } finally {
    writeStream.end();
  }
}

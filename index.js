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
            type: 'positional',
            description: 'Number of lines to extract from each log file',
            required: false
        },
        skip: {
            type: 'number',
            description: 'Number of lines to skip from the beginning',
            alias: 's'
        }
    },
    async run({ args }) {
        let numLines = args.lines ? parseInt(args.lines) : undefined;
        if (!numLines) {
            let input = await consola.prompt('Enter the number of lines to extract:');
            input = input ? input.replace(/_/g, '') : '';
            numLines = parseInt(input);
            if (isNaN(numLines) || numLines <= 0) {
            throw new Error('Invalid number of lines. Please provide a positive integer.');
            }
        }

        let skipLines = typeof args.skip === 'number' ? args.skip : undefined;
        if (skipLines === undefined) {
            let input = await consola.prompt('Enter the number of lines to skip from the beginning (default 0):');
            input = input ? input.replace(/_/g, '') : '0';
            skipLines = parseInt(input);
            if (isNaN(skipLines) || skipLines < 0) {
            throw new Error('Invalid number of lines to skip. Please provide a non-negative integer.');
            }
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
                await processLogFile(file, numLines, skipLines);
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
 * Processes a single log file by reading the first N lines after skipping some and saving them to the output directory.
 * @param {string} fileName - The name of the log file to process.
 * @param {number} maxLines - The number of lines to extract.
 * @param {number} skipLines - The number of lines to skip from the beginning.
 */
async function processLogFile(fileName, maxLines, skipLines) {
    const inputPath = path.join('./input', fileName);
    const outputPath = path.join('./output', fileName);

    const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(outputPath);

    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let skipped = 0;

    try {
        for await (const line of rl) {
            if (skipped < skipLines) {
                skipped++;
                continue;
            }
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

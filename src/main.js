import fs from 'fs';
import ora from 'ora';
import path from 'path';
import readline from 'readline';
import { consola } from 'consola';
import { defineCommand, runMain } from 'citty';
import { formatNumber } from './utils/number/format.js';
import { humanFileSize } from './utils/string/fileSize.js';
import { msToHuman, secondsToHuman } from './utils/date/time.js';

//
// ==== CLI Parameters ================================================================================================
//
const command = defineCommand({
    args: {
        lines: {
            type: 'number',
            description: 'Number of lines to extract from each log file',
            alias: 'l'
        },
        skip: {
            type: 'number',
            description: 'Number of lines to skip from the beginning',
            alias: 's'
        },
        reverse: {
            type: 'boolean',
            description: 'Reverse the order of the extracted lines',
            alias: 'r'
        }
    },
    async run({ args }) {
        const reverse = args.reverse || false;
        if (reverse) consola.info('Running in reverse mode.');

        let maxLines = args.lines;
        if (!maxLines) {
            const input = await consola.prompt('Enter the number of lines to extract:');
            const sanitizedInput = input ? input.replace(/_/g, '') : '';
            maxLines = parseInt(sanitizedInput);
            if (isNaN(maxLines) || maxLines <= 0) {
                throw new Error('Invalid number of lines. Please provide a positive integer.');
            }
        }

        let skipLines = args.skip;
        if (skipLines === undefined) {
            const promptMessage = `Enter the number of lines to skip from the ${reverse ? 'end' : 'beginning'} (default 0):`;
            const input = await consola.prompt(promptMessage);
            const sanitizedInput = input ? input.replace(/_/g, '') : '0';
            skipLines = parseInt(sanitizedInput, 10);
            if (isNaN(skipLines) || skipLines < 0) {
                throw new Error('Invalid number of lines to skip. Please provide a non-negative integer.');
            }
        }
        
        consola.box(`    Log Splitter    \n\nMax lines: ${maxLines}\nSkip lines: ${skipLines}${reverse ? '\nReverse mode' : ''}`);

        const inputDir = './input';
        const outputDir = './output';

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            const files = await fs.promises.readdir(inputDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            for (const file of logFiles) {
                consola.info(`Processing ${file}...`);
                await processLogFile(file, maxLines, skipLines, reverse);
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
// ==== Main Function ==============================================================================================
//
/**
 * Processes a single log file by reading lines and saving them to the output directory.
 * @param {string} fileName - The name of the log file to process.
 * @param {number} maxLines - The number of lines to extract.
 * @param {number} skipLines - The number of lines to skip from the beginning or end depending on reverse.
 * @param {boolean} reverse - Whether to extract from the end instead of the beginning.
 */
async function processLogFile(fileName, maxLines, skipLines, reverse) {
    const inputPath = path.join('./input', fileName);
    const outputPath = path.join('./output', fileName);

    let totalLines = 0;
    if (reverse) {
        const result = await countLinesWithTiming(fileName, inputPath);
        totalLines = result.totalLines;
    }

    const readSpinner = ora(`Reading lines from ${fileName}...`).start();

    const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(outputPath);

    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let skipped = 0;
    let lines = [];

    let startLine;
    if (reverse) {
        startLine = Math.max(0, totalLines - skipLines - maxLines);
    } else {
        startLine = skipLines;
    }

    try {
        for await (const line of rl) {
            if (skipped < startLine) {
                skipped++;
                continue;
            }
            if (lineCount >= maxLines) {
                break;
            }
            lines.push(line);
            lineCount++;
        }
        readSpinner.succeed(`Read ${formatNumber(lineCount)} lines from ${fileName}`);
        for (const l of lines) {
            writeStream.write(l + '\n');
        }
    } catch (error) {
        readSpinner.fail(`Error reading ${fileName}: ${error.message}`);
        consola.error(`Error processing file ${fileName}:`, error);
    } finally {
        writeStream.end();
    }
}

//
// ==== Helper Functions ==============================================================================================
//

/**
 * Counts the total lines in a file, measures the time taken, and provides feedback.
 * @param {string} fileName - The name of the file.
 * @param {string} inputPath - The path to the file.
 * @returns {Promise<{totalLines: number, elapsed: number, fileSizeHuman: string}>}
 */
async function countLinesWithTiming(fileName, inputPath) {
    const stats = fs.statSync(inputPath);
    const fileSize = stats.size;
    const fileSizeHuman = humanFileSize(fileSize);

    const BYTES_PER_MB = 1024 * 1024;
    const ASSUMED_MB_PER_SECOND = 150;
    const estimatedTime = Math.ceil(fileSize / (BYTES_PER_MB * ASSUMED_MB_PER_SECOND));
    const estimatedTimeHuman = secondsToHuman(estimatedTime);

    if (estimatedTime > 30) {
        consola.info(`This may take a while. Estimated time: ${estimatedTimeHuman} based on file size (${fileSizeHuman}).`);
    }

    const startTime = Date.now();
    const spinner = ora(`Counting total lines in ${fileName} (${fileSizeHuman})...`).start();

    try {
        const countStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
        const countRl = readline.createInterface({
            input: countStream,
            crlfDelay: Infinity
        });

        let totalLines = 0;
        for await (const line of countRl) {
            totalLines++;
        }

        const endTime = Date.now();
        const elapsed = endTime - startTime;
        const elapsedHuman = msToHuman(elapsed);
        const actualSeconds = elapsed / 1000;
        const diff = actualSeconds - estimatedTime;
        const diffAbs = Math.abs(diff);
        const diffHuman = secondsToHuman(diffAbs);
        const diffText = diff > 0 ? `${diffHuman} slower` : `${diffHuman} faster`;

        // Stop spinner with success message
        spinner.succeed(`Total lines in ${fileName}: ${formatNumber(totalLines)} (took ${elapsedHuman}, ${diffText} than estimated)`);

        return { totalLines, elapsed, fileSizeHuman };
    } catch (error) {
        // Handle errors gracefully
        spinner.fail(`Error counting lines in ${fileName}: ${error.message}`);
        throw error;
    }
}
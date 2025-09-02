import fs from 'fs';
import ora from 'ora';
import path from 'path';
import readline from 'readline';
import { consola } from 'consola';
import { defineCommand, runMain } from 'citty';

//
// ==== CLI Parameters ================================================================================================
//
const command = defineCommand({
    args: {
        string: {
            type: 'string',
            description: 'The string to search for in the log files'
        },
        context: {
            type: 'number',
            description: 'Total number of lines to save in output (including the found line)'
        }
    },
    async run({ args }) {
        let searchString = args.string;
        if (!searchString) {
            const input = await consola.prompt('Enter the string to search for:');
            searchString = input || '';
            if (!searchString) {
                throw new Error('Search string cannot be empty.');
            }
        }

        let contextLines = args.context;
        if (contextLines === undefined) {
            const input = await consola.prompt('Enter the total number of lines to save (including the found line, default 1):');
            const sanitizedInput = input ? input.replace(/_/g, '') : '1';
            contextLines = parseInt(sanitizedInput, 10);
            if (isNaN(contextLines) || contextLines < 1) {
                throw new Error('Invalid number of lines. Please provide a positive integer.');
            }
        }

        consola.box(`    Log Search    \n\nSearch string: "${searchString}"\nTotal lines: ${contextLines}`);

        const inputDir = './input';
        const outputDir = './output';

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            const files = await fs.promises.readdir(inputDir);
            const logFiles = files.filter(file => file.endsWith('.log'));

            for (const file of logFiles) {
                consola.info(`Processing ${file}...`);
                const outputFileName = await processLogFile(file, searchString, contextLines);
                consola.success(`Finished processing ${file} -> ${outputFileName}.`);
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
 * Processes a single log file by searching for the string and extracting context lines.
 * @param {string} fileName - The name of the log file to process.
 * @param {string} searchString - The string to search for.
 * @param {number} contextLines - The total number of lines to save.
 * @returns {Promise<string>} The name of the output file created.
 */
async function processLogFile(fileName, searchString, contextLines) {
    const inputPath = path.join('./input', fileName);
    const sanitizedString = searchString.replace(/[^a-zA-Z0-9]/g, '_');
    const outputFileName = fileName.replace('.log', `_search-${sanitizedString}_lines-${contextLines}.log`);
    const outputPath = path.join('./output', outputFileName);

    try {
        const spinner = ora(`Processing ${fileName}...`).start();
        const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });

        let preBuffer = [];
        let lines = [];
        let found = false;
        let afterCount = 0;

        const before = Math.floor((contextLines - 1) / 2);
        const after = contextLines - 1 - before;

        for await (const line of rl) {
            if (!found) {
                preBuffer.push(line);
                if (preBuffer.length > before) {
                    preBuffer.shift();
                }
                if (line.toLowerCase().includes(searchString.toLowerCase())) {
                    found = true;
                    lines = [...preBuffer, line];
                }
            } else {
                lines.push(line);
                afterCount++;
                if (afterCount >= after) {
                    break;
                }
            }
        }

        if (!found) {
            spinner.fail(`String "${searchString}" not found in ${fileName}`);
            return;
        }

        spinner.succeed(`Found and extracted context in ${fileName}`);

        // Write the extracted lines to the output file
        const writeStream = fs.createWriteStream(outputPath);
        for (const l of lines) {
            writeStream.write(l + '\n');
        }
        writeStream.end();

        consola.success(`Extracted ${lines.length} lines containing the found string in ${fileName}`);
    } catch (error) {
        consola.error(`Error processing ${fileName}: ${error.message}`);
    }

    return outputFileName;
}



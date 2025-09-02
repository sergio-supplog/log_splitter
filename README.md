# Log Splitter and Search

A Node.js CLI toolset for processing log files: extract lines by count/skip/reverse, or search for a string with context.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/sergio-supplog/log_splitter.git
cd log_splitter
npm install
```

## Tools

### Log Splitter (`src/main.js`)

Extract a specified number of lines from log files, with options to skip lines and reverse the order. Output files are named with parameters for clarity, e.g., `input.log` becomes `input_lines-100_skip-0.log` or `input_lines-50_skip-10_reverse.log`.

#### Usage

Place your log files in the `input/` directory.

Run the tool:

```bash
node src/main.js --lines 1000 --skip 0
```

#### Options

- `--lines, -l`: Number of lines to extract (prompted if not provided)
- `--skip, -s`: Number of lines to skip from the beginning (or end if reverse, prompted if not provided)
- `--reverse, -r`: Extract from the end instead of the beginning

#### Examples

Extract first 100 lines:

```bash
node src/main.js --lines 100
```

Skip first 50 lines and extract next 100:

```bash
node src/main.js --lines 100 --skip 50
```

Extract last 100 lines:

```bash
node src/main.js --lines 100 --reverse
```

Run without arguments to be prompted for values.

### Log Search (`src/search.js`)

Search for a specific string in log files (case insensitive) and extract the total specified number of lines centered around the found string. Output files are named with the search string and parameters, e.g., `input.log` becomes `input_search-error_lines-5.log`.

#### Usage

Place your log files in the `input/` directory.

Run the tool:

```bash
node src/search.js --string "ERROR" --context 5
```

#### Options

- `--string`: The string to search for (prompted if not provided)
- `--context`: Total number of lines to save in output (including the found line, prompted if not provided)

#### Examples

Search for "ERROR" and save 5 lines total:

```bash
node src/search.js --string "ERROR" --context 5
```

Search for a phrase and save 1 line (just the found line):

```bash
node src/search.js --string "connection failed" --context 1
```

Run without arguments to be prompted for values.

## Dependencies

- citty: CLI framework
- consola: Logging
- ora: Spinners

## License

ISC

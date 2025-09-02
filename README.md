# Log Splitter

A Node.js CLI tool to extract a specified number of lines from log files, with options to skip lines and reverse the order.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/sergio-supplog/log_splitter.git
cd log_splitter
npm install
```

## Usage

Place your log files in the `input/` directory.

Run the tool:

```bash
node src/main.js --lines 1000 --skip 0
```

## Options

- `--lines, -l`: Number of lines to extract (required if not prompted)
- `--skip, -s`: Number of lines to skip from the beginning (or end if reverse)
- `--reverse, -r`: Extract from the end instead of the beginning

## Examples

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

## Dependencies

- citty: CLI framework
- consola: Logging
- ora: Spinners

## License

ISC

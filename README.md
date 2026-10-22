# SVG Editor

A TypeScript command-line SVG editor, developed incrementally for Lab1.

## Current scope

This iteration provides a minimal interactive CLI. It prints a welcome
message, reads commands from standard input, supports `help` and `exit`, and
reports unknown commands. Shape models, editing commands, SVG I/O, and
undo/redo are intentionally not implemented yet.

## Requirements

- Node.js 22 or later (verified with Node.js 22.22.2)
- npm

## Development

```text
npm install
npm run typecheck
npm test
npm run cli
```

`npm run cli` builds the project and starts the interactive editor.
`npm start` starts the previously built CLI without rebuilding.

## Usage

```text
npm run cli
```

Then enter `help` to list commands or `exit` to quit.

The source layout follows the assignment architecture:

- `src/cli/` — command-line entry point, interactive loop, and input handling.
- `src/model/` — SVG domain objects and document state (planned).
- `src/commands/` — editable commands and undo/redo (planned).
- `src/io/` — SVG parsing, serialization, and file I/O (planned).
- `test/` — automated CLI integration tests.
- `doc/README.md` — architecture and development record.

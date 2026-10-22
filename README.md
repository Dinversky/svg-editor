# SVG Editor

A TypeScript command-line SVG editor, developed incrementally for Lab1.

## Current scope

This iteration provides a minimal rectangle-only SVG document editor. The
implemented commands are:

- `init [w] [h]` — create a new canvas; defaults to `800x600`.
- `create rect <id> <x> <y> <w> <h> [fill]` — add a rectangle.
- `tree` — display the canvas and its rectangles in document order.
- `save [file.svg]` — serialize the canvas to SVG and write it to a file.
- `help` / `exit`.

Repeating `init` replaces the current document. Because `read` is not
implemented yet, a newly initialized document has no source path; `save`
without a filename therefore reports an error. Other shape types, containers,
editing commands, Command, Composite, undo/redo, and the `box` plugin are not
implemented.

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

At the `svg>` prompt:

```text
init 800 600
create rect r1 100 120 200 80 blue
tree
save demo.svg
exit
```

The last command writes `demo.svg` in the current working directory. Enter
`help` to list commands or `exit` to quit.

## Manual verification

1. Run `npm run cli`.
2. Enter the commands shown above.
3. Open the generated `demo.svg` in Chrome or Edge. A blue rectangle at
   `(100, 120)` with size `200x80` should be visible.

The source layout follows the assignment architecture:

- `src/cli/` — entry point, interactive loop, command parsing, and tree output.
- `src/model/` — `Canvas`, `RectangleShape`, and `ShapeFactory`.
- `src/commands/` — editable commands and undo/redo (planned).
- `src/io/` — SVG serialization and file writing.
- `test/` — automated CLI integration tests.
- `doc/README.md` — architecture and development record.

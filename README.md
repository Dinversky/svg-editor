# SVG Editor

A TypeScript command-line SVG editor, developed incrementally for Lab1.

## Current scope

This iteration provides a minimal SVG document editor with rectangles,
circles, ellipses, lines, and text. The implemented commands are:

- `init [w] [h]` — create a new canvas; defaults to `800x600`.
- `create rect <id> <x> <y> <w> <h> [fill]` — add a rectangle.
- `create circle <id> <cx> <cy> <r> [fill]` — add a circle.
- `create ellipse <id> <cx> <cy> <rx> <ry> [fill]` — add an ellipse.
- `create line <id> <x1> <y1> <x2> <y2> [stroke]` — add a line.
- `create text <id> <x> <y> "content"` — add a text element.
- `create g <id>` — add an empty group.
- `tree` — display the canvas and its shapes in document order.
- `save [file.svg]` — serialize the canvas to SVG and write it to a file.
- `help` / `exit`.

Repeating `init` replaces the current document. Because `read` is not
implemented yet, a newly initialized document has no source path; `save`
without a filename therefore reports an error. Group containers exist in the
model and empty groups can be created with `create g`, but commands for
populating groups (`create ... in`), `group`/`ungroup`, and recursive tree
output are not implemented. Other shape types, concrete editing commands,
undo/redo, and the `box` plugin are not implemented. The `Command` interface
and `CommandRegistry` foundation exist, but no concrete command classes or
command history are implemented.

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
create circle c1 100 100 20 red
create ellipse e1 300 150 80 50 green
create line l1 100 250 700 250 black
create text t1 40 300 "Hello SVG"
create g markers
tree
save demo.svg
exit
```

The last command writes `demo.svg` in the current working directory. Enter
`help` to list commands or `exit` to quit.

Input rules:

- Arguments are separated by whitespace.
- Use double quotes for an argument containing spaces, for example
  `save "my drawing.svg"`.
- A line whose first non-whitespace character is `#` is a comment. A value
  such as `#fff` inside a command remains a normal argument; inline comments
  are not supported.

## Manual verification

1. Run `npm run cli`.
2. Enter the commands shown above.
3. Open the generated `demo.svg` in Chrome or Edge. A blue rectangle at
   `(100, 120)` with size `200x80`, a red circle centered at `(100, 100)`
   with radius `20`, a green ellipse centered at `(300, 150)` with
   radii `80x50`, a black line from `(100, 250)` to `(700, 250)`, and
   black text `Hello SVG` at `(40, 300)` should be visible.

The source layout follows the assignment architecture:

- `src/cli/` — entry point, interactive loop, tokenization, command parsing, and tree output.
- `src/model/` — `Shape`, `Rect`, `Circle`, `Ellipse`, `Line`, `Text`, `Group`, `Document`, container/ID management, and `ShapeFactory`.
- `src/commands/` — `Command` interface and `CommandRegistry` foundation; concrete edit commands and undo/redo are planned.
- `src/io/` — SVG serialization and file writing.
- `src/errors/` — shared `EditorError` type for expected editor errors.
- `test/` — automated CLI, tokenizer, model, and command-registry tests.
- `doc/README.md` — architecture and development record.

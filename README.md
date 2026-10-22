# SVG Editor

This repository contains the TypeScript CLI skeleton for Lab1 Phase 1.

## Current scope

Task 1 establishes the buildable project structure and CLI entry point. SVG
editing commands, shape models, SVG I/O, and undo/redo are intentionally not
implemented yet.

## Development

```text
npm install
npm run typecheck
npm run build
npm start
```

The source layout follows the assignment architecture:

- `src/cli/` — command-line entry point and input handling.
- `src/model/` — SVG domain objects and document state.
- `src/commands/` — editable commands and undo/redo.
- `src/io/` — SVG parsing, serialization, and file I/O.
- `test/` — automated tests when the first business slice is implemented.
- `doc/README.md` — architecture and development record.

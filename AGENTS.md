# SVG Editor — Agent Instructions

## 1. Project Goal

Implement the SVG editor CLI according to the assignment specification.

The implementation must use TypeScript and object-oriented design.
Do not implement features that are explicitly outside the current phase.

## 2. Workflow Rules

- Work on one small, verifiable task at a time.
- Before editing, inspect the existing files and Git status.
- Do not overwrite or delete existing files without explaining why.
- Do not implement the entire project in one change.
- Before finishing a task, run the relevant tests and type checks.
- Report changed files, commands executed, results, and remaining issues.
- Do not create Git commits unless explicitly asked.

## 3. Architecture Rules

- `src/model/`: domain objects and document state.
- `src/commands/`: edit commands and undo/redo management.
- `src/cli/`: input parsing, command dispatch, and user-facing output.
- `src/io/`: SVG parsing, serialization, and file I/O.
- `test/`: automated tests.
- `doc/README.md`: architecture, process log, consistency check, and quality assurance.

Dependency direction:

- CLI may depend on commands and I/O.
- Commands may depend on the model.
- I/O may depend on the model.
- The model must not depend on CLI, I/O, or concrete command classes.

Follow the assignment's one-class-per-file rule. Use the class name as the filename.

## 4. Design Requirements

- Use the Command pattern for editable operations and undo/redo.
- Use the Composite pattern so leaf shapes and containers share the required operations.
- Keep shape creation/type dispatch in the designated factory.
- Keep command-name dispatch in the designated command dispatcher.
- Avoid spreading `switch` statements over shape types throughout the codebase.
- Do not use anemic data objects with all business logic placed in unrelated procedural functions.

## 5. Correctness and Errors

- Shape IDs must be unique and case-sensitive.
- Invalid commands must report errors and must not mutate document state.
- Respect the SVG coordinate system and the assignment's command syntax.
- Preserve parent-child relationships and child ordering.
- Test undo/redo behavior, including clearing redo history after a new edit.
- Follow the assignment specification when requirements conflict with general preferences.

## 6. Scope Control

- Do not implement the future `box` plugin unless explicitly requested.
- Do not add unnecessary frameworks, dependencies, or abstractions.
- Ask for clarification when a requirement is ambiguous; do not silently invent behavior.

## 7. Final Report

For each task, report:

1. What changed.
2. Why the change is needed.
3. Tests and type checks run.
4. Results and known limitations.
5. Suggested next task.

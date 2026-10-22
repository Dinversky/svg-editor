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

### 2.1 README Update Gate

Root `README.md` must be updated in the same task if and only if the task changes at least one of these externally visible facts:

1. CLI behavior: commands, parameters, syntax, output, or error text.
2. Build, run, or setup workflow: npm scripts, dependencies, Node version, or entry point.
3. Repository layout or layer responsibilities presented to users or developers.
4. Current phase scope: implemented versus not-yet-implemented features.
5. User-facing limitations or known behavior that affects use.

An update is necessary only when leaving `README.md` unchanged would make a documented statement false or misleading.

Root `README.md` must not be updated for:

- Internal refactors, private classes, algorithms, or implementation details.
- Tests, comments, formatting, or renames, unless they change a fact listed above.
- Temporary experiments or work outside the current phase.
- Content that belongs only in `doc/README.md`.

When an update is necessary, edit only the affected sections; never rewrite unrelated content. Keep root `README.md` short and user-facing: purpose, current scope, setup/run commands, usage, and limitations. Architecture, process log, consistency checks, and quality assurance belong in `doc/README.md`.

If no listed fact changes, do not touch `README.md`; report `README.md: no update required — <reason>`.

`doc/README.md` is not subject to this gate. When a task modifies files under `doc/`, read and follow
`doc/AGENTS.md` in addition to this root file.


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
3. README decision: sections updated, or `no update required` with the reason.
4. Tests and type checks run.
5. Results and known limitations.
6. Suggested next task.

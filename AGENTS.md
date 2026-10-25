# SVG Editor — Agent Instructions

## 1. Project Goal

Implement the SVG editor CLI according to the assignment specification.

- Use TypeScript and object-oriented design.
- Follow the assignment requirements and the design decisions already established in the project.
- Implement only the features included in the current task and phase.
- Preserve existing behavior unless the task explicitly requires a change.
- Distinguish the current implementation from the target architecture and planned features.

## 2. Workflow Rules

### 2.1 Start-of-Task Checks

Before making changes:

1. Read this file, `doc/AGENTS.md`, `项目规划.md`, and `doc/README.md`.
2. Inspect the current Git status, current branch, and latest commit.
3. Inspect the files relevant to the task and review existing tests.
4. Identify the task's scope, dependencies, acceptance criteria, and applicable design decisions.
5. Confirm that the repository state is consistent with the task's stated baseline.

Use the following commands as appropriate:

```bash
git status --short --branch
git branch --show-current
git log -1 --oneline
git diff
git diff --cached
```

Do not assume that the working tree is clean or that the latest commit matches the planning documents.

If relevant uncommitted changes, unexpected repository state, conflicting instructions, or an unclear task baseline are found:

- Do not overwrite, discard, reset, or otherwise disturb existing changes.
- Do not start implementation if the conflict could affect the task.
- Report the relevant findings and ask for clarification when necessary.

### 2.2 Small, Verifiable Tasks

- Work on one small, verifiable task at a time.
- Follow the task's stated scope and acceptance criteria.
- Do not implement the entire project in one change.
- Do not add features from later phases unless explicitly requested.
- Do not refactor unrelated modules merely because they could be improved.
- Before changing or deleting existing files, inspect their contents and explain the necessity in the task report.
- Prefer focused changes that preserve existing behavior outside the task scope.

### 2.3 Keep Planning and Execution Documents Synchronized

Documentation synchronization is part of task completion, not optional cleanup.

For each task:

1. Read the current planning and documentation files before implementation.
2. After implementation and validation, determine which documents are affected.
3. Update affected documents in the same task.
4. Check that the resulting documents agree with the actual code, tests, Git state, and known limitations.
5. Report which documents were updated and which did not require changes.

Responsibilities of the main documents:

- `AGENTS.md`: rules that apply to all coding tasks.
- `项目规划.md`: current repository baseline, phase/task status, execution progress, blockers, and next task.
- `doc/README.md`: actual architecture, design decisions, development process, consistency checks, and quality assurance.
- `README.md`: concise, user-facing project scope, setup, usage, and limitations.
- `doc/AGENTS.md`: rules for maintaining the course documentation.

Update `项目规划.md` when a task changes any of the following:

- Current implementation or task completion status.
- Current execution baseline or the next task.
- Phase completion criteria or task dependencies.
- Known blockers, scope decisions, or unresolved planning issues.

Update `doc/README.md` when a task changes or verifies any of the following:

- Architecture, module responsibilities, or dependency relationships.
- Design patterns or significant design decisions.
- Development milestones, important issues, or their resolutions.
- Testing, validation, consistency checks, or known limitations.

Update both `项目规划.md` and `doc/README.md` when both documents' responsibilities are affected.

Do not mechanically duplicate the entire task specification in multiple documents. Keep task acceptance criteria in their designated planning source and record implementation facts and validation results in the repository documentation.

Do not claim that documentation is synchronized if an update was blocked or could not be verified. Report the specific issue and do not describe the entire task as complete while a required documentation update remains unresolved.

### 2.4 Testing and Validation

Before finishing a task:

1. Run the relevant targeted tests.
2. Run `npm run typecheck`.
3. Run `npm test`.
4. Run `git diff --check`.
5. Review the complete diff, including staged and unstaged changes.
6. Inspect the final Git status.
7. Update the required documentation and verify its consistency with the implementation and validation results.

Run the commands that are applicable to the current repository and task. If a command cannot be run, report why.

Do not claim that a test, type check, build, manual verification, or other check passed unless it was actually executed and its result was observed.

Distinguish between:

- Checks executed during the current task.
- Results recorded in existing documentation or previous task reports.
- Manual checks that were actually performed.
- Checks that remain outstanding.

Do not add dependencies, frameworks, or new validation tools solely to satisfy this checklist. Follow the current project setup unless a separate task explicitly authorizes a change.

### 2.5 Git Operation Authorization

Do not perform any of the following unless the user explicitly authorizes it:

- Creating a Git commit.
- Pushing to a remote repository.
- Creating, deleting, or moving a Git tag.
- Rewriting Git history or performing destructive Git operations.

After completing the task, report the working-tree status and relevant diff summary. Leave the changes available for user review.

## 3. README Update Gate

Root `README.md` must be updated in the same task if and only if the task changes at least one of these externally visible facts:

1. CLI behavior: commands, parameters, syntax, output, or error text.
2. Build, run, or setup workflow: npm scripts, dependencies, Node version, or entry point.
3. Repository layout or layer responsibilities presented to users or developers.
4. Current phase scope: implemented versus not-yet-implemented features.
5. User-facing limitations or known behavior that affects use.

An update is necessary when leaving `README.md` unchanged would make a documented statement false or misleading.

Root `README.md` must not be updated for:

- Internal refactors, private classes, algorithms, or implementation details.
- Tests, comments, formatting, or renames, unless they change a fact listed above.
- Temporary experiments or work outside the current phase.
- Content that belongs only in `doc/README.md`.

When an update is necessary, edit only the affected sections; do not rewrite unrelated content. Keep root `README.md` short and user-facing: purpose, current scope, setup/run commands, usage, and limitations.

Architecture, process records, consistency checks, and quality assurance belong in `doc/README.md`.

If no listed fact changes, do not touch `README.md`;

`doc/README.md` is not subject to this gate. Whenever a task modifies documentation, read and follow `doc/AGENTS.md` in addition to this file.

## 4. Architecture Rules

Follow the established project architecture and distinguish current implementation from target design.

Target module responsibilities:

- `src/model/`: domain objects, shapes, containers, and document state.
- `src/commands/`: edit commands and command-related undo/redo behavior.
- `src/cli/`: input parsing, command dispatch, and user-facing output.
- `src/io/`: SVG parsing, serialization, and file I/O.
- `src/app/`, if introduced by an explicitly authorized task: application-level orchestration and dependency assembly.
- `test/`: automated tests.
- `doc/README.md`: architecture, process records, consistency checks, and quality assurance.

Use `src/commands/` (plural) as the command-module directory. Do not introduce a parallel `src/command/` directory without explicit authorization.

Target dependency direction:

- CLI may depend on application orchestration, commands, and I/O as required by the established design.
- Commands may depend on the model and the explicitly defined command context.
- I/O may depend on the model.
- The model must not depend on CLI, I/O, or concrete command classes.
- Application-level orchestration may assemble the model, commands, and I/O without moving domain rules into the CLI.

Do not force a large architectural migration into a task that only requires a small feature. If the current implementation deviates from the target architecture, preserve unrelated behavior and record the relevant deviation in `doc/README.md`.

Follow the assignment's one-class-per-file rule. Use the class name as the filename, subject to the repository's existing naming conventions and TypeScript requirements.

## 5. Design Requirements

- Use the Command pattern for editable operations and undo/redo as required by the assignment.
- Use the Composite pattern so leaf shapes and containers share the required operations.
- Keep shape creation/type dispatch in the designated shape factory.
- Keep command-name dispatch in the designated command dispatcher or registry when that integration is part of the current task.
- Avoid spreading shape-type-specific `switch` statements across unrelated modules.
- Do not treat every `switch` statement or every `instanceof` check as an architectural violation. Evaluate whether it represents type dispatch that belongs in a factory or another designated component.
- Do not move all business logic into unrelated procedural functions or create anemic data objects when the domain model should own the behavior.
- Do not claim that a design pattern is implemented merely because an interface, registry, or placeholder exists. Verify the actual implementation.

## 6. Correctness and Errors

- Shape IDs must be unique and case-sensitive.
- Invalid commands must report errors and must not mutate document state.
- Validate all relevant inputs before applying state changes.
- Respect the SVG coordinate system and the assignment's command syntax.
- Preserve parent-child relationships and child ordering.
- Prevent invalid container relationships, including self-containment and cycles, where applicable.
- Test undo/redo behavior, including clearing redo history after a new edit, when those features are implemented.
- Follow the assignment specification when requirements conflict with general preferences.
- When the assignment specification is ambiguous, do not silently invent externally visible behavior. Consult the user before making a consequential decision.

## 7. Scope Control

- Do not implement the future `box` plugin unless explicitly requested.
- Do not add unnecessary frameworks, dependencies, or abstractions.
- Do not implement later-phase features as incidental additions to the current task.
- Do not change established public command syntax or output unless required by the task.
- Do not remove existing code, tests, or historical records merely because they appear obsolete. Inspect their purpose and explain the proposed change first.
- If a task cannot be completed within its stated scope because of a dependency or architectural conflict, report the blocker instead of silently expanding the scope.

## 8. Final Report

For each task, report:

1. **Task scope:** the task and acceptance criteria addressed.
2. **Implementation:** what changed and why.
3. **Files changed:** relevant source, tests, and documentation.
4. **Validation:** commands actually executed and their results.
5. **Documentation synchronization:** which documents were updated, which required no change, and any unresolved inconsistency.
6. **Git state:** current branch, working-tree status, and a concise diff summary.
7. **Limitations:** known issues, unverified behavior, and remaining work.
8. **Next task:** the next planned task according to the authoritative planning source, or the conflict that prevents selecting it.

Do not report a task as fully complete if required implementation, validation, or documentation work remains unresolved.
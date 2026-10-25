# Documentation Maintenance

Maintain `doc/README.md` as the unified course documentation for this project.

This file defines documentation-specific rules. The root `AGENTS.md` defines the general workflow rules that apply to all tasks. Follow both files when a task affects documentation.

The purpose of this document is to keep the course documentation accurate, traceable, and aligned with the actual codebase and assignment requirements. Documentation must describe verified implementation and decisions, not merely the intended design.

## 0. Documentation Structure

`doc/README.md` must cover the following areas and satisfy the applicable assignment requirements.

### 0.1 Architectural Design

| # | Item | Requirements |
|---|---|---|
| 1 | **Module Partitioning** | Define the modules/directories and the responsibilities of each module. Include a PlantUML component or package diagram. |
| 2 | **Design Pattern Selection** | Explain which design patterns are required or selected, where they are implemented, and how they are applied in the codebase. The Command pattern is required by the assignment. Distinguish implemented patterns from planned patterns. |
| 3 | **Dependency Rules** | Specify permitted module dependencies and explain their rationale. Identify actual violations or deviations that still need to be addressed. |
| 4 | **Anticipated Points of Change** | Identify areas likely to change. For each area, explain what provisions have been made or why no additional provision is justified. |

When describing the architecture, clearly distinguish:

- **Current implementation:** behavior and structures that exist in the code now.
- **Target architecture:** structures required by the assignment or established design decisions but not yet fully implemented.
- **Known deviations:** differences between the current implementation and target architecture.
- **Revision history:** significant changes to the design and the reasons for those changes.

Do not describe a target design or planned feature as implemented.

### 0.2 Process Documentation

Document representative development milestones and important iterations, including:

- Significant architectural or implementation decisions.
- Problems found in AI-generated suggestions, documentation, or code.
- How those problems were investigated and corrected.
- Important testing or validation outcomes.
- Changes in scope, design, or implementation approach and the reasons for them.

Prefer consolidated milestone records over one entry per prompt or minor code change.

### 0.3 Consistency Self-Check

Review the implementation against the documented architecture and assignment requirements.

At minimum, address:

1. **Module partitioning:** Does the actual directory structure match the documented responsibilities? If not, are the differences recorded?
2. **Dependency rules:** Are actual dependencies consistent with the documented rules? Record any known violations or limitations.
3. **Design patterns:** Are the documented patterns genuinely implemented, or are some still planned?
4. **Behavior and requirements:** Do the implementation and user-visible behavior match the applicable assignment requirements?
5. **Documentation consistency:** Do the current architecture, implementation status, and validation results agree across the relevant documents?

A spot check may be used where appropriate, but state its scope. Do not imply that the entire dependency graph or codebase was exhaustively reviewed if only selected files were inspected.

### 0.4 Quality Assurance

Explain how the implementation was validated and provide evidence supporting any quality claims.

Distinguish between:

- Automated tests.
- Type checking and build checks.
- Linting or dependency checks, if configured.
- Manual CLI and SVG-rendering checks.
- Code and diff review.
- Continuous integration checks, if configured and executed.

For each reported check, state its result and relevant limitations. Do not describe a check as completed merely because it is planned or recommended.

## 1. Development Process Record

The development record must cover the project lifecycle, from initial setup through implementation, testing, refinement, and final delivery.

Follow these rules:

- Record progress at meaningful milestones, such as completing a phase, making a significant architectural decision, resolving a major issue, or completing a critical validation step.
- Do not create separate entries for every prompt, minor code edit, or repetitive implementation attempt.
- If an existing entry already covers a milestone, update that entry rather than creating a duplicate.
- Preserve the history of significant decisions, design changes, issues, solutions, and validation results.
- Clearly distinguish completed work from planned work and outstanding tasks.
- Record only facts supported by repository history, code, task records, command output, or other available evidence.
- Do not fabricate previous decisions, implementation details, test results, manual checks, or tool executions.
- When the source of a result matters, distinguish current-task verification from information recorded in earlier documentation or reports.

Do not rewrite historical records merely to make them match the current architecture. Correct factual errors carefully while preserving the meaningful history of decisions and changes.

## 2. Living Documentation

Keep the architectural design, consistency self-check, and quality assurance sections aligned with the actual implementation and current assignment requirements.

Whenever relevant changes occur:

- Update existing sections instead of duplicating the entire section for each iteration.
- Record current module responsibilities and actual dependency relationships.
- Identify which design patterns are implemented and which remain planned.
- Record known deviations between the current implementation and target architecture.
- Preserve unresolved issues and their limitations until they are fixed or explicitly accepted.
- Update testing and quality assurance claims when validation practices or results change.

Do not add unnecessary documentation merely to make the document longer. Keep descriptions specific, verifiable, and useful for understanding or maintaining the project.

## 3. When to Update Documentation

### 3.1 Update `doc/README.md` When

Update the relevant sections in the same task when a change affects:

- Module boundaries, responsibilities, or dependencies.
- Architecture or an important design decision.
- The implementation or status of a required design pattern.
- A significant development milestone or issue resolution.
- Testing, validation, consistency checks, or quality assurance.
- A known limitation, architectural deviation, or important unresolved issue.

At task completion, verify that the affected sections reflect the resulting implementation and actual validation results.

### 3.2 Coordinate With Other Project Documents

Each document has a distinct responsibility:

- Root `AGENTS.md`: general rules for all coding tasks.
- `项目规划.md`: current repository baseline, phase/task status, blockers, and next task.
- Notion「任务规划」: detailed task breakdown, implementation scope, and acceptance criteria, when accessible.
- `doc/README.md`: architecture, design decisions, development history, consistency checks, and quality assurance.
- Root `README.md`: concise user-facing scope, setup, usage, and limitations.

Do not duplicate the complete task plan in `doc/README.md`.

When implementation changes task status, update `项目规划.md` according to the root `AGENTS.md` rules. When implementation or validation changes the documented architecture or development record, update `doc/README.md` as well.

If planning sources disagree, do not silently change the documentation to conceal the disagreement. Identify the conflict and seek clarification when it affects the implementation or acceptance criteria.

### 3.3 Documentation Completion Check

Before reporting a task as complete, verify that:

1. The updated documentation matches the resulting code and repository state.
2. Statements about tests and checks are supported by actual results or are explicitly attributed to existing records.
3. Completed, planned, and outstanding work are clearly distinguished.
4. No affected section contains stale claims that contradict the task's verified results.
5. Significant unresolved issues remain documented.
6. The task report identifies which documents were updated and which did not require changes.

If a required update cannot be completed, state why and identify the remaining work. Do not claim full documentation completion.

## 4. Scope and Accuracy

- Do not implement extra features solely to make the documentation appear complete.
- Do not change the implementation merely to match inaccurate documentation without first investigating the discrepancy.
- Do not delete or rewrite historical records without a clear reason.
- Follow the assignment's required documentation structure.
- If a requirement conflicts with the current implementation or another instruction, report the conflict accurately.
- Do not claim that a requirement, design pattern, test, manual check, or quality gate has been satisfied without evidence.
- If information is unavailable, state that it has not been verified rather than filling the gap with an assumption.

In the final task report, summarize the documentation changes, identify any remaining gaps, and distinguish verified results from items that still require review.
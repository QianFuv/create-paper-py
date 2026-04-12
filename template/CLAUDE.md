# CLAUDE.md

This document defines the collaboration constraints for Claude Code (`claude.ai/code`) when working in this repository.

## General Principles

- **Think Before Coding**: State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask.

- **Simplicity First**: Write the minimum code that solves the problem. No speculative features, no abstractions for single-use code, no unnecessary "flexibility" or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

- **Surgical Changes**: Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style. If your changes create orphaned imports/variables/functions, remove them; don't remove pre-existing dead code unless asked. Every changed line should trace directly to the request.

- **Goal-Driven Execution**: Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verification checks. Write tests that reproduce bugs before fixing them. Ensure tests pass before and after refactors.

## Coding Standards

- **Language**: Use English for code, comments, Python docstrings, and commit messages. Repository documentation may use Chinese, but use English by default unless otherwise specified.

- **Comments**: Do not write inline comments. Explanatory content should be placed in docstrings.

- **Docstrings**: All Python functions, classes, and modules must use the standard docstring format:

  ```python
  def function_name(arg1: type, arg2: type) -> return_type:
      """
      Briefly describe what the function does.

      Args:
          arg1: Description of arg1.
          arg2: Description of arg2.

      Returns:
          Description of the return value.
      """
  ```

- **Quality Checks**: After modifying code, run the applicable checks and fix all reported issues before finishing.

  **Backend (Python)**:
  - `uv run ruff check <code/dir>`: Static analysis and style checks
  - `uv run ruff format <code/dir>`: Code formatting
  - `uv run mypy <code/dir>`: Static type checking

  **Frontend (only when the project contains a frontend)**:
  - Linting: `pnpm exec eslint <dir>`
  - Formatting: `pnpm exec prettier --write <dir>`
  - Type checking: `pnpm exec tsc --noEmit`

  If the project has no frontend (no `package.json`), skip all frontend checks.

## Git Commits

- **Single Responsibility**: Each commit must contain exactly one logical change. Do not combine unrelated fixes, refactors, or UI adjustments into the same commit.

- **Message Format**: Follow the repository's existing Conventional Commit style:

  ```text
  type(scope): short imperative description
  ```

- **Committer**: Use the default Git committer identity. Do not add `Co-authored-by` or any other trailer.

- **Commit Permission**: Do not run `git commit` autonomously. Every commit requires explicit approval from the user. After each set of changes, present what will be committed and wait for permission before committing. Previous approval does not carry over — each commit needs fresh permission.

- **Commit Rules**:
  - Lowercase type + short specific scope + imperative English description, no period, no emojis or issue numbers
  - Commit message must be a single line — no body, no multi-line explanation
  - Unrelated concerns must be split into separate commits
  - Examples: `fix(admin): improve mobile layouts`, `feat(tracking): add ai failover and strict push gating`, `refactor(notify): drop legacy ai config aliases`


## Context7 Integration

When you encounter any of the following situations, you must prioritize using the Context7 MCP tools:

- Generating code that involves external libraries
- Dependency installation, initialization, or configuration steps
- Looking up library or API documentation

For all dependencies, use `mcp__context7__resolve_library_id` and `mcp__context7__query_docs` directly to ensure the referenced documentation is up to date.

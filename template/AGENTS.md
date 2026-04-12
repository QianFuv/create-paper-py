# AGENTS.md

This document defines the collaboration constraints for Codex (`openai/codex`) when working in this repository.

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

- **Quality Checks**: After modifying code, you must run the following checks:
  - `uv run ruff check <code/dir>`: Static analysis and style checks
  - `uv run ruff format <code/dir>`: Code formatting
  - `uv run mypy <code/dir>`: Static type checking
  - `pnpm lint`: Frontend linting
  - `pnpm exec tsc --noEmit`: Frontend type checking

  Fix all issues reported by these tools before finishing the task.

## Git Commits

- **Single Responsibility**: Each commit must contain exactly one logical change. Do not combine unrelated fixes, refactors, or UI adjustments into the same commit.

- **Message Format**: Follow the repository's existing Conventional Commit style:

  ```text
  type(scope): short imperative description
  ```

- **Commit Rules**:
  - Use lowercase commit types such as `feat`, `fix`, `refactor`, or `docs`
  - Use a short, specific scope such as `admin`, `settings`, `tracking`, `dialog`, `app`, `favorites`, `notify`, or `mcp`
  - Write the description in English
  - Use an imperative description that states the change directly
  - Do not end the summary with a period
  - Do not add emojis, issue numbers, or extra commentary
  - If the work includes multiple unrelated concerns, split it into multiple commits

- **Examples**:
  - `fix(admin): improve mobile layouts`
  - `fix(settings): improve mobile layouts`
  - `fix(dialog): constrain shared modal widths`
  - `feat(tracking): add ai failover and strict push gating`
  - `refactor(notify): drop legacy ai config aliases`

## Context7 Integration

When you encounter any of the following situations, you must prioritize using the Context7 MCP tools:

- Generating code that involves external libraries
- Dependency installation, initialization, or configuration steps
- Looking up library or API documentation

For all dependencies, use `mcp__context7__resolve_library_id` and `mcp__context7__query_docs` directly to ensure the referenced documentation is up to date.

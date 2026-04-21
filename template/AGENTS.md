# AGENTS.md

This document defines the collaboration constraints for Coding CLI when working in this repository.

## General Principles

- **Think Before Coding**: State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask.

- **Simplicity First**: Write the minimum code that solves the problem. No speculative features, no abstractions for single-use code, no unnecessary "flexibility" or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

- **Surgical Changes**: Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style. If your changes create orphaned imports/variables/functions, remove them; don't remove pre-existing dead code unless asked. Every changed line should trace directly to the request.

- **Goal-Driven Execution**: Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verification checks. Write tests that reproduce bugs before fixing them. Ensure tests pass before and after refactors.

## Coding Standards

### Common

- **Language**: Use English for all code, comments, documentation comments, and commit messages. Repository documentation may use Chinese, but use English by default unless otherwise specified.

- **Comments**: Do not write inline comments. Explanatory content must be placed in the language's standard documentation format (TSDoc / docstrings / doc comments).

- **Naming**:
  - Use only ASCII characters in identifiers.
  - Names must be clear, descriptive, and meaningful. Avoid ambiguous abbreviations (e.g., `nErr`, `pcReader`, `usr`).
  - Short names (single letter) are allowed **only** for local variables with very limited scope (≤ 10 lines).
  - Do not encode type information in names (no Hungarian notation: `strName`, `bFlag`, `oUser`).
  - Treat acronyms as whole words: `HttpUrl` not `HTTPUrl`, `XmlParser` not `XMLParser`.
  - Prioritize readability over brevity.
  - Boolean variables should use `is`, `has`, `should`, `can`, or `did` prefixes.

- **Quality Checks**: After modifying code, run the applicable checks for the language and fix all reported issues before finishing.

### TypeScript / JavaScript

- **TSDoc**: All functions, classes, and modules must have TSDoc:

  ```typescript
  /**
   * Briefly describe what the function does.
   *
   * @param arg1 - Description of arg1.
   * @param arg2 - Description of arg2.
   * @returns Description of the return value.
   */
  function functionName(arg1: Type, arg2: Type): ReturnType {
    // ...
  }
  ```

- **Naming**:

  | Identifier | Convention |
  |---|---|
  | Classes, interfaces, types, enums, decorators, type parameters, TSX components | `PascalCase` |
  | Variables, parameters, functions, methods, properties, module aliases | `camelCase` |
  | Module-level constants, `static readonly` fields, enum values | `CONSTANT_CASE` |

  - **Prohibited**: `_` prefix/suffix on identifiers, `I` prefix for interfaces, `opt_` prefix for optional parameters, `#private` fields (use `private` keyword), `public` modifier (unless for non-readonly constructor parameter properties).
  - Local aliases must preserve the original casing. Use `const` for variable aliases, `readonly` for class field aliases.

- **File Extensions**: Always use `.tsx` for TypeScript source files, even when the file contains no JSX. Do not use `.ts`.

- **Quality Checks**:
  - Linting: `pnpm exec eslint <dir>`
  - Formatting: `pnpm exec prettier --write <dir>`
  - Type checking: `pnpm exec tsc --noEmit`

### Python

- **Docstrings**: All functions, classes, and modules must have Google-style docstrings:

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

- **Naming**:

  | Identifier | Convention |
  |---|---|
  | Classes, exceptions, type variables | `PascalCase` |
  | Functions, methods, variables, parameters | `snake_case` |
  | Modules, packages | `lowercase` |
  | Module-level constants | `UPPER_SNAKE_CASE` |

  - Use `trailing_underscore_` to avoid conflicts with Python keywords.
  - Exception classes must use the `Error` suffix.
  - Never use `l`, `O`, or `I` as single-character variable names.

- **Quality Checks**:
  - Linting: `uv run ruff check <dir>`
  - Formatting: `uv run ruff format <dir>`
  - Type checking: `uv run mypy <dir>`

### Rust

- **Doc Comments**: All public functions, structs, enums, traits, and modules must have doc comments (`///` or `//!`):

  ```rust
  /// Briefly describe what the function does.
  ///
  /// # Arguments
  ///
  /// * `arg1` - Description of arg1.
  /// * `arg2` - Description of arg2.
  ///
  /// # Returns
  ///
  /// Description of the return value.
  pub fn function_name(arg1: Type, arg2: Type) -> ReturnType {
      // ...
  }
  ```

- **Naming**:

  | Identifier | Convention |
  |---|---|
  | Types, traits, enum variants | `PascalCase` |
  | Crates, modules, functions, methods, local variables | `snake_case` |
  | Constants, statics | `SCREAMING_SNAKE_CASE` |

  - Conversion methods: `as_` (borrowed, no cost), `to_` (expensive/owned), `into_` (consumes self).
  - Getters: `foo()` to get, `set_foo()` to set. No `get_` prefix.
  - Iterator methods on collections: `iter`, `iter_mut`, `into_iter`.
  - Do not use `-rs` or `-rust` in crate names.

- **Quality Checks**:
  - Formatting: `cargo fmt --all -- --check` (auto-fix: `cargo fmt --all`)
  - Linting: `cargo clippy --all-targets --all-features -- -D warnings`
  - Testing: `cargo test`
  - Dependency ordering: `cargo sort --check`
  - Memory safety: `cargo miri test`

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

## MCPs

### Context7

Context7 provides real-time library and framework documentation lookup. Use it whenever you need up-to-date API references — your training data may not reflect recent changes.

- **When to use**:
  - Generating code that involves external libraries
  - Dependency installation, initialization, or configuration steps
  - Looking up library or API documentation, even for well-known libraries (React, Next.js, Prisma, etc.)

- **When NOT to use**:
  - Refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts

- **Workflow**:
  1. Call `resolve-library-id` with the library name and query to obtain a Context7-compatible library ID (format: `/org/project`). Select the result based on name match, source reputation, snippet coverage, and benchmark score.
  2. Call `query-docs` with the resolved library ID and a specific question to retrieve documentation and code examples.

- **Rules**:
  - Always resolve the library ID first unless the user explicitly provides one in `/org/project` format.
  - Do not call either tool more than 3 times per question. Use the best result available after 3 attempts.
  - Use the official library name with proper punctuation (e.g., `Next.js` not `nextjs`, `Three.js` not `threejs`).

### Grok Search

Grok Search provides web search, content fetching, and site mapping. Use it for questions that require current information beyond the knowledge cutoff or outside the scope of library documentation.

- **When to use**:
  - Searching for real-time or recent information (news, releases, changelogs)
  - Fetching and extracting content from specific URLs
  - Exploring website structure and discovering pages
  - Ranking and filtering sources by relevance
- **When NOT to use**:
  - Library or API documentation lookup (use Context7 instead)
  - Information that can be derived from the local codebase or git history
- **Available tools**:
  - **`web_search`** — Perform a deep web search and return Grok's answer. Returns a `session_id` for retrieving cached sources.
  - **`web_fetch`** — Fetch and extract full content from a URL as structured Markdown.
  - **`web_map`** — Map a website's structure by graph traversal. Start with low `max_depth` (1–2) for initial exploration.
  - **`describe_url`** — Ask Grok to read a single page and return a title plus verbatim extracts.
  - **`rank_sources`** — Reorder a numbered source list by relevance to a query.
  - **`get_sources`** — Retrieve cached sources from a previous `web_search` call using `session_id`.
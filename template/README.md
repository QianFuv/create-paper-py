# {{project_name}}

{{project_description}}

## Environment

- Python >= {{python_version}}
- [uv](https://docs.astral.sh/uv/) for dependency management

## Getting Started

```bash
# Install project dependencies
uv sync

# Install dev dependencies (ruff + mypy)
uv sync --extra dev
```

## Project Structure

```
{{project_name}}/
├── scripts/        # Python source code (entry points & business logic)
├── tests/          # Unit / integration tests
├── datas/
│   ├── assets/     # Static assets (images, fonts, etc.)
│   ├── raw_data/   # Original, immutable input data
│   ├── data/       # Processed / intermediate data
│   └── output/     # Models, metrics, artifacts
├── docs/           # Documentation
├── backup/         # Backups
└── pyproject.toml  # Project dependencies & tool config
```

## Code Quality

After writing code, run:

```bash
uv run ruff check      # Lint
uv run ruff format     # Format
uv run mypy            # Type check
```

## Adding Dependencies

```bash
uv add <package>              # Runtime dependency
uv add --dev <package>        # Dev dependency
```

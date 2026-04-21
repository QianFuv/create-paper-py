# create-paper-py

Scaffold a UV-powered Python research paper project in seconds — a `create-vite`-style CLI for academic/research work.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (the generated project is managed by `uv`)
- git (optional, used only when you enable `git init`)
- NVIDIA GPU + driver (optional, auto-detected for PyTorch CUDA configuration)

The CLI probes for these tools at startup and prints install hints if anything is missing.

## Usage

```bash
npm create @qianfuv/paper-py@latest my-paper
# or
npx @qianfuv/create-paper-py my-paper
# or
pnpm create @qianfuv/paper-py my-paper
```

## What it generates

```
<project>/
├── scripts/
│   ├── __init__.py
│   └── s0_utilities/
│       └── dataset_loader.py   # config-driven data loading
├── tests/
├── datas/
│   ├── assets/                 # static assets (fonts, images)
│   │   └── TimesSun.ttf
│   ├── raw_data/               # original data + datasets.json config
│   │   └── datasets.json
│   ├── data/                   # processed data
│   └── output/                 # models, metrics, artifacts
├── docs/
├── backup/
├── .gitignore
├── CLAUDE.md
├── AGENTS.md
├── pyproject.toml              # [project] + [tool.ruff] + [tool.mypy]
└── README.md
```

## Interactive flow

1. Project name (validated, normalized to PEP-503)
2. Short description
3. Python version (auto-detected from `uv python list`)
4. Runtime packages (space-separated, optional)
5. Dev tools (`ruff` + `mypy`)
6. Extra dev packages (optional)
7. PyTorch — auto-detects CUDA via `nvidia-smi`; shows CUDA version selector when GPU is found, CPU-only otherwise
8. `uv sync` — create `.venv` and install now
9. `git init`

Non-interactive mode: `npx @qianfuv/create-paper-py my-paper --yes`

## Version detection

All version defaults are fetched at runtime:

| Item | Source |
|------|--------|
| Python | `uv python list --only-installed` |
| PyTorch | PyPI JSON API |
| CUDA options | PyTorch wheel index + `nvidia-smi` |

Fallback values are used when network or tools are unavailable.

## Local Development

```bash
npm install
npm run build          # produces dist/index.js
npm run smoke          # end-to-end smoke test

# Code quality
npm run lint           # eslint
npm run format         # prettier
npm run typecheck      # tsc --noEmit
```

Run the CLI directly:

```bash
node dist/index.js my-test-project
```

## Project layout (this repo)

```
create-paper-py/
├── src/
│   ├── index.tsx       # CLI entry, orchestration
│   ├── prompts.tsx     # interactive flow
│   ├── env-check.tsx   # uv/git/CUDA detection + version fetching
│   ├── scaffold.tsx    # template copy + placeholder substitution
│   ├── runners.tsx     # uv / git subprocess wrappers
│   ├── render.tsx      # gradient banner + spinner
│   ├── utils.tsx       # shared helpers
│   ├── types.tsx       # type definitions
│   └── smoke.tsx       # end-to-end smoke test
├── template/           # project template (copied as-is, placeholders applied)
├── eslint.config.mjs
├── .prettierrc
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

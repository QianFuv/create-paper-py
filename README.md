# create-paper-py

`create-paper-py` 是一个用于快速生成 Python 论文 / 科研项目骨架的 CLI。生成出的项目默认使用 `uv` 管理依赖，并内置常用目录结构、基础配置文件和一个可扩展的数据加载工具模块。

## 功能说明

- 生成基于 `uv` 的 Python 项目骨架，适合论文实验、模型训练和科研脚本整理。
- 交互式收集项目配置，包括项目名、简介、Python 版本、运行时依赖和开发依赖。
- 自动检测本机环境，包括 `uv`、`git` 和 NVIDIA CUDA 状态。
- 可选安装 PyTorch，并根据环境选择 CPU 或 CUDA 对应配置。
- 可选自动执行 `uv sync` 创建虚拟环境并安装依赖。
- 可选自动执行 `git init` 初始化仓库。
- 默认生成 `scripts`、`tests`、`datas`、`docs`、`backup` 等常用目录。
- 模板内置 `datasets.json` 和 `dataset_loader.py`，便于按配置加载原始数据集。

## 使用方法

在使用前，请先确保本机已安装 `uv`。随后可以通过以下任一方式创建项目：

```bash
npm create @qianfuv/paper-py@latest my-paper
# 或
npx @qianfuv/create-paper-py my-paper
# 或
pnpm create @qianfuv/paper-py my-paper
```

如果你希望跳过交互式提问，可以使用：

```bash
npx @qianfuv/create-paper-py my-paper --yes
```

生成后的项目默认包含以下结构：

```text
<project>/
├── scripts/
├── tests/
├── datas/
│   ├── assets/
│   ├── raw_data/
│   ├── data/
│   └── output/
├── docs/
├── backup/
├── pyproject.toml
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

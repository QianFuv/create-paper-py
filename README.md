# create-paper-py

`create-paper-py` 是一个用于快速生成 Python 论文 / 科研项目骨架的 CLI。生成出的项目默认使用 `uv` 管理依赖，并内置常用目录结构、基础配置文件和一个可扩展的数据加载工具模块。

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

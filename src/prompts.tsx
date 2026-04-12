import * as p from "@clack/prompts";
import pc from "picocolors";
import { basename } from "node:path";
import {
  isDirEmpty,
  isValidProjectName,
  parsePackageList,
  resolveTargetDir,
  toPythonPackageName,
} from "./utils.js";
import type { ComputePlatform, EnvCheckResult, ProjectConfig } from "./types.js";

function bail(msg?: string): never {
  p.cancel(msg ?? "Operation cancelled.");
  process.exit(0);
}

function cudaTagToLabel(tag: string): string {
  const num = parseInt(tag.replace("cu", ""), 10);
  const major = Math.floor(num / 10);
  const minor = num % 10;
  return `CUDA ${major}.${minor}`;
}

function buildCudaOptions(
  availableTags: string[],
  cudaVersion: string | null,
): { value: ComputePlatform; label: string; hint?: string }[] {
  let compatible = availableTags;
  if (cudaVersion) {
    const detected = parseInt(cudaVersion.replace(".", ""), 10);
    compatible = availableTags.filter((tag) => {
      const tagNum = parseInt(tag.replace("cu", ""), 10);
      return tagNum <= detected;
    });
  }
  if (compatible.length === 0) compatible = availableTags.slice(0, 3);

  const options = compatible.slice(0, 4).map((tag, i) => ({
    value: tag as ComputePlatform,
    label: cudaTagToLabel(tag),
    hint: i === 0 ? "recommended" : undefined,
  }));
  options.push({ value: "cpu" as ComputePlatform, label: "CPU only", hint: undefined });
  return options;
}

export async function collectProjectConfig(env: EnvCheckResult): Promise<ProjectConfig> {
  const defaultName = env.defaultName;
  const projectNameInput = await p.text({
    message: "Project name:",
    placeholder: defaultName ?? "my-paper",
    defaultValue: defaultName ?? "my-paper",
    validate(value) {
      const name = (value || defaultName || "my-paper").trim();
      if (!isValidProjectName(name)) {
        return "Project name contains invalid characters.";
      }
      return undefined;
    },
  });
  if (p.isCancel(projectNameInput)) bail();
  const rawName = (projectNameInput as string)?.trim() || defaultName || "my-paper";

  const targetDir = resolveTargetDir(rawName);

  if (!(await isDirEmpty(targetDir))) {
    const overwrite = await p.confirm({
      message: `Directory ${pc.cyan(targetDir)} is not empty. Continue anyway?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) bail("Aborted to avoid overwrite.");
  }

  const packageName = toPythonPackageName(rawName);
  if (packageName !== rawName) {
    p.log.info(`Directory: ${pc.cyan(rawName)}  Python package: ${pc.cyan(packageName)}`);
  }

  const description = await p.text({
    message: "Short description:",
    placeholder: "A Python research project",
    defaultValue: "A Python research project",
  });
  if (p.isCancel(description)) bail();

  const pythonVersion = await p.text({
    message: "Python version:",
    placeholder: env.latestPython,
    defaultValue: env.latestPython,
    validate(value) {
      const v = (value || env.latestPython).trim();
      if (!/^\d+\.\d+(\.\d+)?$/.test(v)) {
        return "Use major.minor format, e.g. 3.13 or 3.14";
      }
      return undefined;
    },
  });
  if (p.isCancel(pythonVersion)) bail();

  const runtimeDepsInput = await p.text({
    message: `Runtime packages ${pc.dim("(space-separated, blank to skip)")}:`,
    placeholder: "e.g. numpy pandas matplotlib",
    defaultValue: "",
  });
  if (p.isCancel(runtimeDepsInput)) bail();

  const installDev = await p.confirm({
    message: `Install dev tools ${pc.dim("(ruff + mypy)")}?`,
    initialValue: true,
  });
  if (p.isCancel(installDev)) bail();

  const devDepsInput = await p.text({
    message: `Extra dev packages ${pc.dim("(space-separated, blank to skip)")}:`,
    placeholder: "e.g. pytest ipykernel",
    defaultValue: "",
  });
  if (p.isCancel(devDepsInput)) bail();

  const hasCuda = env.cuda.ok;

  const installPytorch = await p.confirm({
    message: hasCuda
      ? `Install PyTorch ${pc.dim(`(CUDA ${env.cuda.cudaVersion} detected)`)}?`
      : `Install PyTorch ${pc.dim("(CPU only — no CUDA detected)")}?`,
    initialValue: false,
  });
  if (p.isCancel(installPytorch)) bail();

  let pytorchComputePlatform: ComputePlatform | null = null;
  if (installPytorch) {
    if (hasCuda) {
      const options = buildCudaOptions(env.availableCudaTags, env.cuda.cudaVersion);
      const platform = await p.select({
        message: "Compute platform:",
        options,
        initialValue: options[0]!.value,
      });
      if (p.isCancel(platform)) bail();
      pytorchComputePlatform = platform as ComputePlatform;
    } else {
      pytorchComputePlatform = "cpu";
    }
  }

  const runUvSync = await p.confirm({
    message: `Run ${pc.cyan("uv sync")} to create .venv and install now?`,
    initialValue: true,
  });
  if (p.isCancel(runUvSync)) bail();

  const initGit = await p.confirm({
    message: `Initialize a git repository ${pc.dim("(git init, no commit)")}?`,
    initialValue: true,
  });
  if (p.isCancel(initGit)) bail();

  return {
    projectName: packageName,
    targetDir,
    pythonVersion: (pythonVersion as string).trim(),
    description: (description as string).trim(),
    runtimeDeps: parsePackageList(runtimeDepsInput as string),
    devDeps: parsePackageList(devDepsInput as string),
    installDev: installDev as boolean,
    installPytorch: installPytorch as boolean,
    pytorchVersion: env.latestPytorch,
    pytorchComputePlatform,
    initGit: initGit as boolean,
    runUvSync: runUvSync as boolean,
  };
}

export function printSummary(config: ProjectConfig): void {
  const dim = pc.dim;
  const cyan = pc.cyan;

  const pytorchLabel = config.installPytorch
    ? cyan(`torch>=${config.pytorchVersion}`) +
      dim(
        " (" +
          (config.pytorchComputePlatform === "cpu"
            ? "CPU"
            : cudaTagToLabel(config.pytorchComputePlatform ?? "")) +
          ")",
      )
    : dim("no");

  const lines = [
    "",
    pc.bold("  Summary"),
    "",
    `  ${dim("dir        ")}  ${cyan(config.targetDir)}`,
    `  ${dim("package    ")}  ${cyan(config.projectName)}`,
    `  ${dim("python     ")}  ${cyan(">=" + config.pythonVersion)}`,
    `  ${dim("runtime pkg")}  ${config.runtimeDeps.length ? cyan(config.runtimeDeps.join(" ")) : dim("(none)")}`,
    `  ${dim("dev tools  ")}  ${config.installDev ? cyan("ruff + mypy") : dim("(skipped)")}`,
    `  ${dim("extra dev  ")}  ${config.devDeps.length ? cyan(config.devDeps.join(" ")) : dim("(none)")}`,
    `  ${dim("pytorch    ")}  ${pytorchLabel}`,
    `  ${dim("uv sync    ")}  ${config.runUvSync ? cyan("yes") : dim("no")}`,
    `  ${dim("git init   ")}  ${config.initGit ? cyan("yes") : dim("no")}`,
    "",
  ];
  p.log.message(lines.join("\n"));
}

export function defaultNameFromCwd(): string {
  const base = basename(process.cwd());
  const normalized = toPythonPackageName(base);
  return normalized || "my-paper";
}

export function buildDefaultConfig(env: EnvCheckResult): ProjectConfig {
  const name = env.defaultName ?? "my-paper";
  const projectName = toPythonPackageName(name);
  return {
    projectName,
    targetDir: resolveTargetDir(projectName),
    pythonVersion: env.latestPython,
    description: "A Python research project",
    runtimeDeps: [],
    devDeps: [],
    installDev: true,
    installPytorch: false,
    pytorchVersion: env.latestPytorch,
    pytorchComputePlatform: null,
    initGit: true,
    runUvSync: true,
  };
}

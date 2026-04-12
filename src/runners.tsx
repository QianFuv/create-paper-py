import { runCapture } from "./utils.js";
import type { ProjectConfig } from "./types.js";

/**
 * Pin a Python version into the project's .python-version file via uv.
 */
export async function uvPythonPin(config: ProjectConfig): Promise<void> {
  await runCapture("uv", ["python", "pin", config.pythonVersion], {
    cwd: config.targetDir,
  });
}

/**
 * Create the virtualenv (.venv) using uv.
 */
export async function uvVenv(config: ProjectConfig): Promise<void> {
  await runCapture("uv", ["venv", "--python", config.pythonVersion], {
    cwd: config.targetDir,
  });
}

/**
 * Resolve + lock dependencies and sync .venv.
 */
export async function uvSync(config: ProjectConfig, includeDev: boolean): Promise<void> {
  const args = ["sync"];
  if (includeDev) {
    args.push("--extra", "dev");
  }
  await runCapture("uv", args, { cwd: config.targetDir });
}

/**
 * Install user-specified runtime packages via `uv add`.
 */
export async function uvAddRuntime(config: ProjectConfig): Promise<void> {
  if (config.runtimeDeps.length === 0) return;
  await runCapture("uv", ["add", ...config.runtimeDeps], {
    cwd: config.targetDir,
  });
}

/**
 * Install user-specified dev packages via `uv add --dev`.
 */
export async function uvAddDev(config: ProjectConfig): Promise<void> {
  if (config.devDeps.length === 0) return;
  await runCapture("uv", ["add", "--dev", ...config.devDeps], {
    cwd: config.targetDir,
  });
}

/**
 * Initialize a git repository in the target directory (no auto-commit).
 */
export async function gitInit(config: ProjectConfig): Promise<void> {
  await runCapture("git", ["init", "--initial-branch=main"], {
    cwd: config.targetDir,
  });
}

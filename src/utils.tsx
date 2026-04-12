import { spawn, type SpawnOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Run a command and capture its stdout/stderr. Resolves with exit code 0,
 * rejects with an Error that carries stdout/stderr when the child exits non-zero.
 */
export function runCapture(
  cmd: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => rejectPromise(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr, code });
      } else {
        const err = new Error(
          `Command failed: ${cmd} ${args.join(" ")} (exit ${code})\n${stderr || stdout}`,
        );
        rejectPromise(err);
      }
    });
  });
}

/**
 * Run a command while inheriting stdio so the user sees live output.
 */
export function runInherit(
  cmd: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("error", (err) => rejectPromise(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(0);
      } else {
        rejectPromise(new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${code})`));
      }
    });
  });
}

export function isValidProjectName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name === "." || name === "..") return false;
  // eslint-disable-next-line no-control-regex
  if (/[<>:"|?*\x00-\x1f]/.test(name)) return false;
  if (name.startsWith("-") || name.startsWith(".")) return false;
  return true;
}

/**
 * Normalize a freeform project name into a valid PEP 503 package name
 * (lowercase, hyphen/underscore, no leading digit, no consecutive separators).
 */
export function toPythonPackageName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (/^\d/.test(normalized)) normalized = `p-${normalized}`;
  if (!normalized) normalized = "my-paper";
  return normalized;
}

export async function isDirEmpty(dirPath: string): Promise<boolean> {
  if (!existsSync(dirPath)) return true;
  const entries = await readdir(dirPath);
  return entries.length === 0;
}

export async function safeRemoveDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) return;
  await rm(dirPath, { recursive: true, force: true });
}

export function resolveTargetDir(projectName: string): string {
  return resolve(process.cwd(), projectName);
}

/**
 * Parse a whitespace-separated list of package specs (e.g. "numpy pandas>=2.0 torch")
 * into a clean array. Commas are also accepted as separators.
 */
export function parsePackageList(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

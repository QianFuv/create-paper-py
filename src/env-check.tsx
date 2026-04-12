import pc from "picocolors";
import { runCapture } from "./utils.js";
import type { EnvCheckResult } from "./types.js";

const FALLBACK_PYTHON = "3.13";
const FALLBACK_PYTORCH = "2.9.1";
const FALLBACK_CUDA_TAGS = ["cu130", "cu128", "cu126"];

function extractVersion(raw: string): string | null {
  const match = raw.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? (match[1] ?? null) : null;
}

async function checkTool(
  cmd: string,
  args: string[],
): Promise<{ version: string | null; ok: boolean }> {
  try {
    const { stdout, stderr } = await runCapture(cmd, args);
    const raw = (stdout || stderr).trim();
    const version = extractVersion(raw);
    return { version, ok: Boolean(version) };
  } catch {
    return { version: null, ok: false };
  }
}

async function checkCuda(): Promise<{
  driverVersion: string | null;
  cudaVersion: string | null;
  ok: boolean;
}> {
  try {
    const { stdout } = await runCapture("nvidia-smi", []);
    const driverMatch = stdout.match(/Driver Version:\s*([\d.]+)/);
    const cudaMatch = stdout.match(/CUDA Version:\s*(\d+\.\d+)/);
    return {
      driverVersion: driverMatch?.[1] ?? null,
      cudaVersion: cudaMatch?.[1] ?? null,
      ok: Boolean(cudaMatch?.[1]),
    };
  } catch {
    return { driverVersion: null, cudaVersion: null, ok: false };
  }
}

async function fetchLatestPython(): Promise<string> {
  try {
    const { stdout } = await runCapture("uv", ["python", "list", "--only-installed"]);
    const first = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .find((line) => /^cpython-\d+\.\d+/.test(line));
    if (first) {
      const m = first.match(/cpython-(\d+\.\d+)/);
      if (m?.[1]) return m[1];
    }
  } catch {
    /* fallback */
  }
  return FALLBACK_PYTHON;
}

async function fetchLatestPytorch(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://pypi.org/pypi/torch/json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = (await res.json()) as { info: { version: string } };
    if (data.info?.version) return data.info.version;
  } catch {
    /* fallback */
  }
  return FALLBACK_PYTORCH;
}

async function fetchCudaTags(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://download.pytorch.org/whl/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();
    const matches = [...html.matchAll(/href="(cu\d+)\/?"/g)];
    const tags = matches
      .map((m) => m[1]!)
      .filter((t) => parseInt(t.replace("cu", ""), 10) >= 118)
      .sort((a, b) => parseInt(b.replace("cu", ""), 10) - parseInt(a.replace("cu", ""), 10));
    if (tags.length > 0) return tags;
  } catch {
    /* fallback */
  }
  return FALLBACK_CUDA_TAGS;
}

export async function runEnvCheck(): Promise<EnvCheckResult> {
  const [uv, git, cuda, latestPython, latestPytorch, availableCudaTags] = await Promise.all([
    checkTool("uv", ["--version"]),
    checkTool("git", ["--version"]),
    checkCuda(),
    fetchLatestPython(),
    fetchLatestPytorch(),
    fetchCudaTags(),
  ]);

  return { ok: uv.ok, uv, git, cuda, latestPython, latestPytorch, availableCudaTags };
}

export function formatEnvCheck(res: EnvCheckResult): string {
  const lines: string[] = [];
  const mark = (ok: boolean) => (ok ? pc.green("✓") : pc.red("✗"));
  const dim = pc.dim;

  const row = (label: string, ok: boolean, version: string | null, note: string) => {
    const status = mark(ok);
    const versionStr = version ? pc.cyan(`v${version}`) : pc.red("not found");
    return `  ${status} ${label.padEnd(8)} ${versionStr.padEnd(20)} ${dim(note)}`;
  };

  lines.push(pc.bold("Environment check"));
  lines.push(
    row(
      "uv",
      res.uv.ok,
      res.uv.version,
      res.uv.ok ? "(https://docs.astral.sh/uv/)" : "(install from astral.sh)",
    ),
  );
  lines.push(
    row(
      "git",
      res.git.ok,
      res.git.version,
      res.git.ok ? "(optional for git init)" : "(optional; needed only if you enable git init)",
    ),
  );
  lines.push(
    row(
      "CUDA",
      res.cuda.ok,
      res.cuda.cudaVersion,
      res.cuda.ok
        ? `(driver ${res.cuda.driverVersion ?? "unknown"})`
        : "(not found; PyTorch will use CPU)",
    ),
  );
  return lines.join("\n");
}

export function renderMissingToolHelp(res: EnvCheckResult): string {
  const hints: string[] = [];
  if (!res.uv.ok) {
    hints.push(`${pc.red("•")} ${pc.bold("uv")} is required to manage the Python project.`);
    hints.push(
      `    Install on Windows (PowerShell):  ${pc.cyan('powershell -c "irm https://astral.sh/uv/install.ps1 | iex"')}`,
    );
    hints.push(
      `    Install on macOS/Linux:           ${pc.cyan("curl -LsSf https://astral.sh/uv/install.sh | sh")}`,
    );
    hints.push(`    Or via pip:                       ${pc.cyan("pip install uv")}`);
  }
  return hints.join("\n");
}

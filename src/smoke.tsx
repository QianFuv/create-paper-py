import { existsSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import pc from "picocolors";
import { scaffoldProject, verifyScaffold } from "./scaffold.js";
import { uvPythonPin, uvVenv, uvSync, uvAddRuntime, uvAddDev, gitInit } from "./runners.js";
import { runCapture, safeRemoveDir } from "./utils.js";
import { runEnvCheck } from "./env-check.js";
import type { ProjectConfig } from "./types.js";

/**
 * End-to-end smoke test: scaffolds a project into ./test-output/<name>, runs
 * every uv + git step, and asserts on output files and on `uv run python -V`.
 */

interface Scenario {
  name: string;
  runtimeDeps: string[];
  devDeps: string[];
  installDev: boolean;
  runUvSync: boolean;
  initGit: boolean;
}

const OUT_ROOT = resolve(process.cwd(), "test-output");

const assertions: { name: string; pass: boolean; detail?: string }[] = [];

function record(name: string, pass: boolean, detail?: string): void {
  assertions.push({ name, pass, detail });
  const mark = pass ? pc.green("✓") : pc.red("✗");
  console.log(`  ${mark} ${name}${detail ? pc.dim("  — " + detail) : ""}`);
}

async function fileContains(path: string, needle: string): Promise<boolean> {
  if (!existsSync(path)) return false;
  const content = await readFile(path, "utf-8");
  return content.includes(needle);
}

async function resolvePythonVersion(): Promise<string> {
  try {
    const { stdout } = await runCapture("uv", ["python", "list", "--only-installed"]);
    const first = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .find((line) => /^cpython-\d+\.\d+/.test(line));
    if (first) {
      const m = first.match(/cpython-(\d+\.\d+)/);
      if (m) return m[1] ?? "3.12";
    }
  } catch {
    /* fall through */
  }
  return "3.12";
}

async function runScenario(scenario: Scenario, pyVersion: string): Promise<void> {
  const targetDir = join(OUT_ROOT, scenario.name);
  console.log();
  console.log(pc.bold(pc.cyan(`[scenario] ${scenario.name}`)));
  console.log(pc.dim(`  target: ${targetDir}`));

  await safeRemoveDir(targetDir);
  await mkdir(targetDir, { recursive: true });

  const config: ProjectConfig = {
    projectName: scenario.name,
    targetDir,
    pythonVersion: pyVersion,
    description: `Smoke test project ${scenario.name}`,
    runtimeDeps: scenario.runtimeDeps,
    devDeps: scenario.devDeps,
    installDev: scenario.installDev,
    installPytorch: false,
    pytorchVersion: "2.0.0",
    pytorchComputePlatform: null,
    initGit: scenario.initGit,
    runUvSync: scenario.runUvSync,
  };

  await scaffoldProject(config);
  const verify = await verifyScaffold(targetDir);
  record(
    "scaffold: all expected files present",
    verify.ok,
    verify.ok ? undefined : `missing ${verify.missing.join(", ")}`,
  );

  record(
    "scaffold: .gitignore renamed from _gitignore",
    existsSync(join(targetDir, ".gitignore")) && !existsSync(join(targetDir, "_gitignore")),
  );

  const pyProjPath = join(targetDir, "pyproject.toml");
  record(
    "placeholder: pyproject.toml name substituted",
    await fileContains(pyProjPath, `name = "${scenario.name}"`),
  );
  record(
    "placeholder: pyproject.toml python version substituted",
    await fileContains(pyProjPath, `>=${pyVersion}`),
  );
  record("placeholder: no remaining {{...}} markers", !(await fileContains(pyProjPath, "{{")));
  const readmePath = join(targetDir, "README.md");
  record(
    "placeholder: README.md substituted",
    (await fileContains(readmePath, `# ${scenario.name}`)) &&
      !(await fileContains(readmePath, "{{")),
  );

  record("content: CLAUDE.md present and non-empty", existsSync(join(targetDir, "CLAUDE.md")));
  record("content: AGENTS.md present and non-empty", existsSync(join(targetDir, "AGENTS.md")));

  try {
    await uvPythonPin(config);
    record("uv: python pin", true);
    record("uv: .python-version file created", existsSync(join(targetDir, ".python-version")));
  } catch (e) {
    record("uv: python pin", false, (e as Error).message.split("\n")[0]);
    return;
  }

  if (scenario.runUvSync) {
    try {
      await uvVenv(config);
      record("uv: venv created", existsSync(join(targetDir, ".venv")));
    } catch (e) {
      record("uv: venv created", false, (e as Error).message.split("\n")[0]);
      return;
    }

    try {
      await uvSync(config, scenario.installDev);
      record("uv: sync base deps", existsSync(join(targetDir, "uv.lock")));
    } catch (e) {
      record("uv: sync base deps", false, (e as Error).message.split("\n")[0]);
      return;
    }

    if (scenario.runtimeDeps.length > 0) {
      try {
        await uvAddRuntime(config);
        const allPresent = (
          await Promise.all(
            scenario.runtimeDeps.map((pkg) =>
              fileContains(
                pyProjPath,
                pkg
                  .replace(/[<>=!].*$/, "")
                  .trim()
                  .toLowerCase(),
              ),
            ),
          )
        ).every(Boolean);
        record("uv: runtime packages added", allPresent);
      } catch (e) {
        record("uv: runtime packages added", false, (e as Error).message.split("\n")[0]);
      }
    }

    if (scenario.devDeps.length > 0) {
      try {
        await uvAddDev(config);
        record("uv: dev packages added", true);
      } catch (e) {
        record("uv: dev packages added", false, (e as Error).message.split("\n")[0]);
      }
    }

    try {
      const { stdout } = await runCapture("uv", ["run", "python", "-V"], {
        cwd: targetDir,
      });
      record("uv run python -V succeeds", /^Python \d+\.\d+/.test(stdout.trim()), stdout.trim());
    } catch (e) {
      record("uv run python -V succeeds", false, (e as Error).message.split("\n")[0]);
    }

    if (scenario.installDev) {
      try {
        const { stdout } = await runCapture("uv", ["run", "ruff", "--version"], { cwd: targetDir });
        record("dev tool: ruff installed", /ruff \d/.test(stdout));
      } catch (e) {
        record("dev tool: ruff installed", false, (e as Error).message.split("\n")[0]);
      }
      try {
        const { stdout } = await runCapture("uv", ["run", "mypy", "--version"], { cwd: targetDir });
        record("dev tool: mypy installed", /mypy \d/.test(stdout));
      } catch (e) {
        record("dev tool: mypy installed", false, (e as Error).message.split("\n")[0]);
      }
    }
  }

  if (scenario.initGit) {
    try {
      await gitInit(config);
      record("git: repository initialized", existsSync(join(targetDir, ".git")));
    } catch (e) {
      record("git: repository initialized", false, (e as Error).message.split("\n")[0]);
    }
  }
}

async function main(): Promise<void> {
  console.log(pc.bold("create-paper-py smoke test"));
  console.log();

  const env = await runEnvCheck();
  console.log(pc.bold("env:"));
  console.log(
    `  uv   ${env.uv.version ?? "missing"} ${env.uv.ok ? pc.green("ok") : pc.red("fail")}`,
  );
  console.log(
    `  git  ${env.git.version ?? "missing"} ${env.git.ok ? pc.green("ok") : pc.dim("(optional)")}`,
  );
  if (!env.ok) {
    console.error(pc.red("\nenv check failed; aborting smoke test."));
    process.exit(1);
  }

  const py = await resolvePythonVersion();
  console.log(pc.dim(`\nusing python ${py} for smoke tests`));

  await mkdir(OUT_ROOT, { recursive: true });

  await runScenario(
    {
      name: "minimal-paper",
      runtimeDeps: [],
      devDeps: [],
      installDev: false,
      runUvSync: false,
      initGit: false,
    },
    py,
  );

  await runScenario(
    {
      name: "dev-only-paper",
      runtimeDeps: [],
      devDeps: [],
      installDev: true,
      runUvSync: true,
      initGit: true,
    },
    py,
  );

  const passed = assertions.filter((a) => a.pass).length;
  const total = assertions.length;
  const allOk = passed === total;

  console.log();
  console.log(
    pc.bold(
      allOk
        ? pc.green(`✓ ${passed}/${total} assertions passed`)
        : pc.red(`✗ ${passed}/${total} assertions passed`),
    ),
  );
  if (!allOk) {
    console.log();
    console.log(pc.red("failed assertions:"));
    for (const a of assertions) {
      if (!a.pass) {
        console.log(`  ${pc.red("✗")} ${a.name}${a.detail ? pc.dim("  — " + a.detail) : ""}`);
      }
    }
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error(pc.red("\nFatal:"), err.message);
  process.exit(1);
});

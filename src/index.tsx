import * as p from "@clack/prompts";
import pc from "picocolors";
import { formatEnvCheck, renderMissingToolHelp, runEnvCheck } from "./env-check.js";
import {
  buildDefaultConfig,
  collectProjectConfig,
  defaultNameFromCwd,
  printSummary,
} from "./prompts.js";
import { patchPyprojectForPytorch, scaffoldProject, verifyScaffold } from "./scaffold.js";
import { gitInit, uvAddDev, uvAddRuntime, uvPythonPin, uvSync, uvVenv } from "./runners.js";
import { safeRemoveDir } from "./utils.js";
import { createSpinner, renderTitle } from "./render.js";
import type { ProjectConfig } from "./types.js";

const VERSION = "0.1.0";

function printBanner(): void {
  renderTitle();
  const sub = pc.dim(`  v${VERSION}  ·  scaffold a uv-powered research project\n`);
  console.log(sub);
}

interface ParsedArgs {
  positionalName?: string;
  help: boolean;
  version: boolean;
  yes: boolean;
}

function parseArgv(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    help: false,
    version: false,
    yes: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--version" || arg === "-v") out.version = true;
    else if (arg === "--yes" || arg === "-y") out.yes = true;
    else if (!arg.startsWith("-") && !out.positionalName) out.positionalName = arg;
  }
  return out;
}

function printHelp(): void {
  const lines = [
    `${pc.bold("create-paper-py")}  ${pc.dim(`v${VERSION}`)}`,
    "",
    pc.dim("Scaffold a UV-powered Python research paper project in seconds."),
    "",
    pc.bold("Usage:"),
    "  npm create paper-py@latest [project-name]",
    "  npx create-paper-py [project-name]",
    "  create-paper-py [project-name] [--yes]",
    "",
    pc.bold("Options:"),
    "  -h, --help       Show this message",
    "  -v, --version    Show version",
    "  -y, --yes        Accept all defaults (non-interactive)",
  ];
  console.log(lines.join("\n"));
}

async function runStep<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: Error }> {
  const spin = createSpinner();
  spin.start(label);
  try {
    const value = await fn();
    spin.stop(`${pc.green("✓")}  ${label}`);
    return { ok: true, value };
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    spin.stop(`${pc.red("✗")}  ${label}`);
    return { ok: false, error: e };
  }
}

async function execute(config: ProjectConfig): Promise<void> {
  const done: string[] = [];
  let createdTopDir = false;

  const fail = async (step: string, err: Error) => {
    p.log.error(`${pc.red(step + " failed:")} ${err.message}`);

    if (createdTopDir) {
      const rollback = await p.confirm({
        message: `Remove the partially created directory ${pc.cyan(config.targetDir)}?`,
        initialValue: true,
      });
      if (!p.isCancel(rollback) && rollback) {
        try {
          await safeRemoveDir(config.targetDir);
          p.log.info("Cleaned up partial project directory.");
        } catch (rmErr) {
          p.log.warn(`Failed to clean up directory: ${(rmErr as Error).message}`);
        }
      }
    }

    p.outro(pc.red("Aborted."));
    process.exit(1);
  };

  {
    const r = await runStep("Scaffolding project files", async () => {
      await scaffoldProject(config);
      createdTopDir = true;
      const verify = await verifyScaffold(config.targetDir);
      if (!verify.ok) {
        throw new Error(`Missing files after scaffold: ${verify.missing.join(", ")}`);
      }
    });
    if (!r.ok) return fail("Scaffold", r.error);
    done.push("scaffold");
  }

  if (config.installPytorch) {
    const r = await runStep("Configuring PyTorch", async () => {
      await patchPyprojectForPytorch(config);
    });
    if (!r.ok) return fail("PyTorch config", r.error);
    done.push("pytorch-config");
  }

  {
    const r = await runStep(`Pinning Python ${config.pythonVersion}`, () => uvPythonPin(config));
    if (!r.ok) return fail("uv python pin", r.error);
    done.push("pin");
  }

  if (config.runUvSync) {
    {
      const r = await runStep("Creating virtualenv (.venv)", () => uvVenv(config));
      if (!r.ok) return fail("uv venv", r.error);
      done.push("venv");
    }

    {
      const r = await runStep("Syncing base dependencies", () => uvSync(config, config.installDev));
      if (!r.ok) return fail("uv sync", r.error);
      done.push("sync");
    }

    if (config.runtimeDeps.length > 0) {
      const r = await runStep(`Adding runtime packages (${config.runtimeDeps.length})`, () =>
        uvAddRuntime(config),
      );
      if (!r.ok) return fail("uv add (runtime)", r.error);
      done.push("add-runtime");
    }

    if (config.devDeps.length > 0) {
      const r = await runStep(`Adding dev packages (${config.devDeps.length})`, () =>
        uvAddDev(config),
      );
      if (!r.ok) return fail("uv add --dev", r.error);
      done.push("add-dev");
    }
  } else {
    p.log.info(pc.dim("Skipped `uv sync` — run it yourself in the project."));
  }

  if (config.initGit) {
    const r = await runStep("Initializing git repository", () => gitInit(config));
    if (!r.ok) {
      p.log.warn(`git init failed (non-fatal): ${r.error.message}. You can run it manually.`);
    } else {
      done.push("git");
    }
  }

  printNextSteps(config);
  p.outro(pc.green("Done! Happy researching."));
}

function printNextSteps(config: ProjectConfig): void {
  p.log.step(pc.bold("Next steps:"));

  const cmds: string[] = [];
  if (config.projectName !== ".") cmds.push(`cd ${config.projectName}`);
  if (!config.runUvSync) cmds.push("uv sync" + (config.installDev ? " --extra dev" : ""));
  cmds.push("uv run python -V");
  if (config.installDev) {
    cmds.push("uv run ruff check");
    cmds.push("uv run ruff format");
    cmds.push("uv run mypy scripts");
  }

  for (const cmd of cmds) {
    p.log.info(`  ${pc.cyan(cmd)}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgv(process.argv);

  if (args.help) {
    printHelp();
    return;
  }
  if (args.version) {
    console.log(`create-paper-py v${VERSION}`);
    return;
  }

  console.log();
  printBanner();

  const env = await runEnvCheck();
  p.log.message(formatEnvCheck(env));

  if (!env.ok) {
    const help = renderMissingToolHelp(env);
    if (help) {
      p.log.warn(help);
    }
    p.outro(pc.red("Please install the missing tools and try again."));
    process.exit(1);
  }

  if (!env.git.ok) {
    p.log.warn(pc.dim('git not found — the "git init" step will be skipped if you enable it.'));
  }

  env.defaultName = args.positionalName ?? defaultNameFromCwd();

  let config: ProjectConfig;
  if (args.yes) {
    config = buildDefaultConfig(env);
    p.log.info(
      pc.dim(`Non-interactive mode (--yes): using defaults for ${pc.cyan(config.projectName)}.`),
    );
    printSummary(config);
  } else {
    config = await collectProjectConfig(env);
    printSummary(config);
    const confirmed = await p.confirm({
      message: `Create project ${pc.cyan(config.projectName)} now?`,
      initialValue: true,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Aborted by user.");
      process.exit(0);
    }
  }

  await execute(config);
}

main().catch((err: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(pc.red("\nUnexpected error:"), e.message);
  process.exit(1);
});

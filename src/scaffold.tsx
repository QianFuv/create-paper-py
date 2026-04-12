import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Locate the bundled template/ directory. When running from dist/ the template
 * lives one level up; when running straight from src/ (ts-node etc.) it lives two levels up.
 */
export function getTemplateDir(): string {
  const candidates = [
    resolve(__dirname, "..", "template"),
    resolve(__dirname, "..", "..", "template"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    `Could not locate bundled template directory. Looked in:\n${candidates.join("\n")}`,
  );
}

/**
 * File extensions that should have placeholders substituted. Binary files are skipped.
 */
const TEXT_EXTENSIONS = new Set([
  ".py",
  ".toml",
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".cfg",
  ".ini",
  ".lock",
  ".gitignore",
  ".gitkeep",
]);

function isTextFile(path: string): boolean {
  const lower = path.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const ext = lower.substring(dotIdx);
  return TEXT_EXTENSIONS.has(ext);
}

function renderTemplate(content: string, config: ProjectConfig): string {
  return content
    .replace(/\{\{project_name\}\}/g, config.projectName)
    .replace(/\{\{python_version\}\}/g, config.pythonVersion)
    .replace(/\{\{project_description\}\}/g, config.description);
}

async function walkAndRender(dir: string, config: ProjectConfig): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndRender(full, config);
    } else if (entry.isFile() && isTextFile(entry.name)) {
      const raw = await readFile(full, "utf-8");
      const rendered = renderTemplate(raw, config);
      if (rendered !== raw) {
        await writeFile(full, rendered, "utf-8");
      }
    }
  }
}

/**
 * Copy the template tree into targetDir, substitute placeholders in text files,
 * rename _gitignore → .gitignore, and ensure empty placeholder dirs exist.
 */
export async function scaffoldProject(config: ProjectConfig): Promise<void> {
  const templateDir = getTemplateDir();

  if (!existsSync(config.targetDir)) {
    await mkdir(config.targetDir, { recursive: true });
  }

  await cp(templateDir, config.targetDir, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });

  const gitignoreSrc = join(config.targetDir, "_gitignore");
  const gitignoreDst = join(config.targetDir, ".gitignore");
  if (existsSync(gitignoreSrc)) {
    try {
      await rename(gitignoreSrc, gitignoreDst);
    } catch {
      const content = await readFile(gitignoreSrc, "utf-8");
      await writeFile(gitignoreDst, content, "utf-8");
    }
  }

  await walkAndRender(config.targetDir, config);
}

/**
 * Patch pyproject.toml to add PyTorch with optional CUDA index configuration.
 * Must be called AFTER scaffoldProject() has rendered templates.
 */
export async function patchPyprojectForPytorch(config: ProjectConfig): Promise<void> {
  if (!config.installPytorch) return;

  const pyprojectPath = join(config.targetDir, "pyproject.toml");
  let content = await readFile(pyprojectPath, "utf-8");

  content = content.replace(
    /^dependencies\s*=\s*\[\s*\]/m,
    `dependencies = [\n    "torch>=${config.pytorchVersion}",\n]`,
  );

  const platform = config.pytorchComputePlatform;
  if (platform && platform !== "cpu") {
    const sysPlat =
      process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const indexName = `pytorch-${platform}`;
    const indexUrl = `https://download.pytorch.org/whl/${platform}`;

    const extra = `
[tool.uv]
required-environments = [
    "sys_platform == '${sysPlat}'"
]

[[tool.uv.index]]
name = "${indexName}"
url = "${indexUrl}"
explicit = true

[tool.uv.sources]
torch = [
  { index = "${indexName}", marker = "sys_platform == 'linux' or sys_platform == 'win32'" },
]
`;
    content = content.trimEnd() + "\n" + extra;
  }

  await writeFile(pyprojectPath, content, "utf-8");
}

/**
 * Verify that after scaffolding, all expected top-level files/dirs exist.
 * Used in smoke tests.
 */
export async function verifyScaffold(
  targetDir: string,
): Promise<{ missing: string[]; ok: boolean }> {
  const expected = [
    "pyproject.toml",
    "README.md",
    "CLAUDE.md",
    "AGENTS.md",
    ".gitignore",
    "scripts/__init__.py",
    "scripts/s0_utilities/dataset_loader.py",
    "tests",
    "datas/assets",
    "datas/assets/TimesSun.ttf",
    "datas/raw_data",
    "datas/raw_data/datasets.json",
    "datas/data",
    "datas/output",
    "docs",
    "backup",
  ];
  const missing: string[] = [];
  for (const rel of expected) {
    const full = join(targetDir, rel);
    if (!existsSync(full)) {
      missing.push(rel);
      continue;
    }
    try {
      await stat(full);
    } catch {
      missing.push(rel);
    }
  }
  return { missing, ok: missing.length === 0 };
}

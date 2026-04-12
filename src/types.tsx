export type ComputePlatform = "cpu" | `cu${string}`;

export interface ProjectConfig {
  projectName: string;
  targetDir: string;
  pythonVersion: string;
  description: string;
  runtimeDeps: string[];
  devDeps: string[];
  installDev: boolean;
  installPytorch: boolean;
  pytorchVersion: string;
  pytorchComputePlatform: ComputePlatform | null;
  initGit: boolean;
  runUvSync: boolean;
}

export interface EnvCheckResult {
  ok: boolean;
  uv: { version: string | null; ok: boolean };
  git: { version: string | null; ok: boolean };
  cuda: { driverVersion: string | null; cudaVersion: string | null; ok: boolean };
  latestPython: string;
  latestPytorch: string;
  availableCudaTags: string[];
  defaultName?: string;
}

export interface StepResult {
  name: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
}

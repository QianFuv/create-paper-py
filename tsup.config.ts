import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx", "src/smoke.tsx"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  minify: false,
  sourcemap: false,
  shims: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});

#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const target = process.argv[2];
const root = process.cwd();
const isWindows = process.platform === "win32";

function localBin(name) {
  return resolve(root, "node_modules", ".bin", isWindows ? `${name}.cmd` : name);
}

function withMemory(env = process.env) {
  const existing = env.NODE_OPTIONS || "";
  const memoryFlag = "--max_old_space_size=2048";
  return {
    ...env,
    NODE_OPTIONS: existing.includes(memoryFlag)
      ? existing
      : [existing, memoryFlag].filter(Boolean).join(" "),
  };
}

function run(command, args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

if (!["management", "school", "server"].includes(target)) {
  console.error("Usage: node scripts/build-target.mjs <management|school|server>");
  process.exit(1);
}

try {
  if (target === "management" || target === "school") {
    await run(localBin("vite"), ["build"], withMemory({ ...process.env, VITE_SITE: target }));
  } else {
    const env = withMemory();
    await run(localBin("esbuild"), [
      "server/_core/index.ts",
      "--platform=node",
      "--bundle",
      "--format=esm",
      "--outdir=dist",
      "--minify",
      "--packages=external",
    ], env);
    await run(localBin("esbuild"), [
      "server/cli.ts",
      "--platform=node",
      "--bundle",
      "--format=esm",
      "--outdir=dist",
      "--minify",
      "--packages=external",
    ], env);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

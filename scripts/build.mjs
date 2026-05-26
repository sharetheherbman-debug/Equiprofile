#!/usr/bin/env node

import { spawn } from "node:child_process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["run", script], {
      cwd: root,
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${script} exited with code ${code}`));
    });
  });
}

try {
  await runScript("build:sw");
  await runScript("build:management");
  await runScript("build:school");
  await runScript("build:server");
  await runScript("build:fingerprint");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

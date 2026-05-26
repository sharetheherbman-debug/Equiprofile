#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();

function readGitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function injectMeta(htmlPath, buildSha) {
  if (!existsSync(htmlPath)) {
    console.warn(`Warning: index.html not found at ${htmlPath}; skipping meta injection.`);
    return;
  }

  const html = readFileSync(htmlPath, "utf8");
  const meta = `<meta name="x-build-sha" content="${buildSha}">`;
  const updated = html.includes('name="x-build-sha"')
    ? html.replace(/<meta name="x-build-sha" content="[^"]*">/, meta)
    : html.replace(/<meta charset=["'][^"']+["']\s*\/?>/i, (match) => `${match}\n    ${meta}`);

  writeFileSync(htmlPath, updated, "utf8");
}

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const buildSha = readGitSha();
const buildTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const version = packageJson.version || "1.0.0";
const publicDir = resolve(root, "dist", "public");

mkdirSync(publicDir, { recursive: true });
writeFileSync(
  resolve(publicDir, "build.txt"),
  `BUILD_SHA=${buildSha}\nBUILD_TIME=${buildTime}\nVERSION=${version}\n`,
  "utf8",
);

injectMeta(resolve(publicDir, "management", "index.html"), buildSha);
injectMeta(resolve(publicDir, "school", "index.html"), buildSha);

console.log("Build fingerprinting complete");
console.log(`SHA: ${buildSha}`);
console.log(`Time: ${buildTime}`);
console.log(`Version: ${version}`);

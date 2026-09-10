#!/usr/bin/env node
/**
 * @fileoverview Build and pack the package, copy the tarball into ZP-CDN-Server, commit, push, and deploy live.
 *
 * Usage:
 *   pnpm run publish:cdn
 *
 * Produces: https://cdn.zenithpayments.support/zp-shared/payment-logos-{version}.tgz
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cdnRoot = resolve(root, "../ZP-CDN-Server");
const cdnDir = join(cdnRoot, "public/zp-shared");

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const tarballName = `payment-logos-${version}.tgz`;

/**
 * Builds the dist output and packs a tarball into the repo root.
 *
 * @returns {string} Absolute path of the packed tarball.
 */
function buildAndPack() {
  execFileSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });

  const packed = execFileSync("pnpm", ["pack"], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop();

  if (!packed) {
    throw new Error('"pnpm pack" produced no tarball name');
  }

  const packedPath = join(root, packed);
  if (!existsSync(packedPath)) {
    throw new Error(`Missing ${packedPath} after "pnpm pack"`);
  }
  return packedPath;
}

/**
 * @param {string} repoRoot
 * @param {string} filePath
 */
function commitAndPushCdn(repoRoot, filePath) {
  const relativePath = relative(repoRoot, filePath);
  execFileSync("git", ["add", "--", relativePath], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--", relativePath],
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();

  if (!status) {
    console.log(`No CDN changes to commit for ${relativePath}`);
    return;
  }

  const message = `chore: publish payment-logos ${version}`;
  execFileSync("git", ["commit", "-m", message], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  execFileSync("git", ["push"], { cwd: repoRoot, stdio: "inherit" });
  console.log(`Pushed CDN commit for ${relativePath}`);
}

/**
 * Deploys ZP-CDN-Server so public/zp-shared/ is live on cdn.zenithpayments.support.
 *
 * @param {string} repoRoot
 */
function deployCdn(repoRoot) {
  console.log("Deploying CDN Worker (pnpm run deploy)…");
  execFileSync("pnpm", ["run", "deploy"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const liveUrl = `https://cdn.zenithpayments.support/zp-shared/${tarballName}`;
  const response = execFileSync("curl", ["-sI", liveUrl], {
    encoding: "utf8",
  });
  const statusLine = response.split("\n")[0]?.trim() ?? "";
  if (!statusLine.includes("200")) {
    throw new Error(
      `CDN deploy finished but ${liveUrl} did not return HTTP 200:\n${statusLine}`
    );
  }
  console.log(`Live: ${liveUrl} (${statusLine})`);
}

if (!existsSync(cdnRoot)) {
  throw new Error(`Missing CDN checkout at ${cdnRoot}`);
}

const packedPath = buildAndPack();
const target = join(cdnDir, tarballName);

mkdirSync(cdnDir, { recursive: true });
copyFileSync(packedPath, target);
rmSync(packedPath, { force: true });
console.log(`Copied ${tarballName} -> ${target}`);

commitAndPushCdn(cdnRoot, target);
deployCdn(cdnRoot);

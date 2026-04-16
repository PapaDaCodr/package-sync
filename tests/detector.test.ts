import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { detectManager, listLockFiles } from "../src/detector";

describe("detector", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects npm from package-lock.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
    assert.equal(detectManager(tmpDir), "npm");
  });

  it("detects yarn from yarn.lock", () => {
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    assert.equal(detectManager(tmpDir), "yarn");
  });

  it("detects pnpm from pnpm-lock.yaml", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    assert.equal(detectManager(tmpDir), "pnpm");
  });

  it("detects bun from bun.lockb", () => {
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    assert.equal(detectManager(tmpDir), "bun");
  });

  it("detects bun from bun.lock", () => {
    fs.writeFileSync(path.join(tmpDir, "bun.lock"), "");
    assert.equal(detectManager(tmpDir), "bun");
  });

  it("returns null when no lock file exists", () => {
    assert.equal(detectManager(tmpDir), null);
  });

  it("prioritizes yarn.lock over package-lock.json", () => {
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
    assert.equal(detectManager(tmpDir), "yarn");
  });

  it("walks up to parent directories", () => {
    // Create lock file in parent
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    const subDir = path.join(tmpDir, "packages", "sub");
    fs.mkdirSync(subDir, { recursive: true });
    assert.equal(detectManager(subDir), "yarn");
  });

  describe("listLockFiles", () => {
    it("lists all lock files in directory", () => {
      fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
      fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");

      const locks = listLockFiles(tmpDir);
      assert.equal(locks.length, 2);
      const managers = locks.map((l) => l.manager).sort();
      assert.deepEqual(managers, ["npm", "yarn"]);
    });

    it("returns empty array when no lock files", () => {
      assert.deepEqual(listLockFiles(tmpDir), []);
    });
  });
});

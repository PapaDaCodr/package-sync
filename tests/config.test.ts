import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import {
  readProjectConfig,
  writeProjectConfig,
  readLocalConfig,
  writeLocalConfig,
  ensureGitignore,
} from "../src/config";

describe("config", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("project config", () => {
    it("writes and reads project config", () => {
      writeProjectConfig(tmpDir, { canonicalManager: "yarn" });
      const config = readProjectConfig(tmpDir);
      assert.deepEqual(config, { canonicalManager: "yarn" });
    });

    it("returns null when no config exists", () => {
      assert.equal(readProjectConfig(tmpDir), null);
    });

    it("returns null for invalid JSON", () => {
      fs.writeFileSync(path.join(tmpDir, ".psyncrc.json"), "not json");
      assert.equal(readProjectConfig(tmpDir), null);
    });
  });

  describe("local config", () => {
    it("writes and reads local config", () => {
      writeLocalConfig(tmpDir, { preferredManager: "bun" });
      const config = readLocalConfig(tmpDir);
      assert.deepEqual(config, { preferredManager: "bun" });
    });

    it("returns null when no config exists", () => {
      assert.equal(readLocalConfig(tmpDir), null);
    });
  });

  describe("ensureGitignore", () => {
    it("creates .gitignore with entries if it doesn't exist", () => {
      ensureGitignore(tmpDir, ["package-lock.json", ".psyncrc.local.json"]);

      const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
      assert.ok(content.includes("package-lock.json"));
      assert.ok(content.includes(".psyncrc.local.json"));
    });

    it("appends entries to existing .gitignore", () => {
      fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules\n");

      ensureGitignore(tmpDir, ["package-lock.json"]);

      const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
      assert.ok(content.includes("node_modules"));
      assert.ok(content.includes("package-lock.json"));
    });

    it("does not duplicate existing entries", () => {
      fs.writeFileSync(
        path.join(tmpDir, ".gitignore"),
        "node_modules\npackage-lock.json\n",
      );

      ensureGitignore(tmpDir, ["package-lock.json"]);

      const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
      const matches = content.match(/package-lock\.json/g);
      assert.equal(matches?.length, 1);
    });
  });
});

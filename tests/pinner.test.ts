import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { pinVersions } from "../src/pinner";

describe("pinner", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("strips ^ from dependency versions", () => {
    writePkg(tmpDir, {
      dependencies: { express: "^4.21.0", lodash: "^4.17.21" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, true);
    const pkg = readPkg(tmpDir);
    assert.equal(pkg.dependencies.express, "4.21.0");
    assert.equal(pkg.dependencies.lodash, "4.17.21");
  });

  it("strips ~ from dependency versions", () => {
    writePkg(tmpDir, {
      dependencies: { express: "~4.21.0" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, true);
    assert.equal(readPkg(tmpDir).dependencies.express, "4.21.0");
  });

  it("strips >= from dependency versions", () => {
    writePkg(tmpDir, {
      dependencies: { express: ">=4.21.0" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, true);
    assert.equal(readPkg(tmpDir).dependencies.express, "4.21.0");
  });

  it("handles devDependencies and optionalDependencies", () => {
    writePkg(tmpDir, {
      devDependencies: { typescript: "^5.4.5" },
      optionalDependencies: { fsevents: "~2.3.3" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, true);
    const pkg = readPkg(tmpDir);
    assert.equal(pkg.devDependencies.typescript, "5.4.5");
    assert.equal(pkg.optionalDependencies.fsevents, "2.3.3");
  });

  it("does not touch already-pinned versions", () => {
    writePkg(tmpDir, {
      dependencies: { express: "4.21.0" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, false);
    assert.equal(readPkg(tmpDir).dependencies.express, "4.21.0");
  });

  it("does not touch workspace: / file: / link: specifiers", () => {
    writePkg(tmpDir, {
      dependencies: {
        a: "workspace:*",
        b: "file:../local-pkg",
        c: "link:../linked-pkg",
      },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, false);
    const pkg = readPkg(tmpDir);
    assert.equal(pkg.dependencies.a, "workspace:*");
    assert.equal(pkg.dependencies.b, "file:../local-pkg");
    assert.equal(pkg.dependencies.c, "link:../linked-pkg");
  });

  it("does not touch * or latest", () => {
    writePkg(tmpDir, {
      dependencies: { a: "*", b: "latest" },
    });

    const changed = pinVersions(tmpDir);

    assert.equal(changed, false);
  });

  it("preserves original JSON indentation", () => {
    // Write with 4-space indent
    const content = JSON.stringify(
      { dependencies: { express: "^4.21.0" } },
      null,
      4,
    );
    fs.writeFileSync(path.join(tmpDir, "package.json"), content + "\n");

    pinVersions(tmpDir);

    const raw = fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8");
    // Should preserve 4-space indent
    assert.ok(raw.includes('    "express"'));
  });
});

function writePkg(dir: string, pkg: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
  );
}

function readPkg(dir: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
}

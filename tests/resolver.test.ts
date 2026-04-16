import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { resolveFromNodeModules } from "../src/lockfile/resolver";

describe("resolver", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "psync-test-"));
    // Create root package.json
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: { express: "4.21.0" },
        devDependencies: { typescript: "5.4.5" },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty graph when no node_modules", () => {
    const graph = resolveFromNodeModules(tmpDir);
    assert.equal(graph.size, 0);
  });

  it("resolves a simple package", () => {
    createPkg(tmpDir, "express", {
      name: "express",
      version: "4.21.0",
      _resolved: "https://registry.npmjs.org/express/-/express-4.21.0.tgz",
      _integrity: "sha512-abc123",
    });

    const graph = resolveFromNodeModules(tmpDir);

    assert.equal(graph.size, 1);
    const pkg = graph.get("node_modules/express");
    assert.ok(pkg);
    assert.equal(pkg.name, "express");
    assert.equal(pkg.version, "4.21.0");
    assert.equal(pkg.resolved, "https://registry.npmjs.org/express/-/express-4.21.0.tgz");
    assert.equal(pkg.integrity, "sha512-abc123");
    assert.equal(pkg.dev, false);
  });

  it("marks devDependencies as dev: true", () => {
    createPkg(tmpDir, "typescript", {
      name: "typescript",
      version: "5.4.5",
    });

    const graph = resolveFromNodeModules(tmpDir);

    const pkg = graph.get("node_modules/typescript");
    assert.ok(pkg);
    assert.equal(pkg.dev, true);
  });

  it("handles scoped packages", () => {
    const scopeDir = path.join(tmpDir, "node_modules", "@types");
    fs.mkdirSync(scopeDir, { recursive: true });
    fs.mkdirSync(path.join(scopeDir, "node"));
    fs.writeFileSync(
      path.join(scopeDir, "node", "package.json"),
      JSON.stringify({ name: "@types/node", version: "20.14.0" }),
    );

    const graph = resolveFromNodeModules(tmpDir);

    const pkg = graph.get("node_modules/@types/node");
    assert.ok(pkg);
    assert.equal(pkg.name, "@types/node");
    assert.equal(pkg.version, "20.14.0");
  });

  it("handles nested node_modules", () => {
    createPkg(tmpDir, "express", {
      name: "express",
      version: "4.21.0",
      dependencies: { accepts: "~1.3.8" },
    });

    // Nested: express/node_modules/accepts
    const nestedDir = path.join(tmpDir, "node_modules", "express", "node_modules", "accepts");
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(
      path.join(nestedDir, "package.json"),
      JSON.stringify({ name: "accepts", version: "1.3.8" }),
    );

    const graph = resolveFromNodeModules(tmpDir);

    assert.ok(graph.has("node_modules/express"));
    assert.ok(graph.has("node_modules/express/node_modules/accepts"));
    const nested = graph.get("node_modules/express/node_modules/accepts");
    assert.equal(nested?.version, "1.3.8");
  });

  it("copies dependency fields from package.json", () => {
    createPkg(tmpDir, "express", {
      name: "express",
      version: "4.21.0",
      dependencies: { accepts: "~1.3.8" },
      engines: { node: ">=18" },
    });

    const graph = resolveFromNodeModules(tmpDir);
    const pkg = graph.get("node_modules/express");

    assert.ok(pkg);
    assert.deepEqual(pkg.dependencies, { accepts: "~1.3.8" });
    assert.deepEqual(pkg.engines, { node: ">=18" });
  });

  it("skips directories without package.json", () => {
    fs.mkdirSync(path.join(tmpDir, "node_modules", ".bin"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "node_modules", "broken-pkg"), { recursive: true });
    // no package.json in broken-pkg

    const graph = resolveFromNodeModules(tmpDir);
    assert.equal(graph.size, 0);
  });
});

function createPkg(
  projectDir: string,
  name: string,
  pkgJson: Record<string, unknown>,
): void {
  const pkgDir = path.join(projectDir, "node_modules", name);
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify(pkgJson));
}

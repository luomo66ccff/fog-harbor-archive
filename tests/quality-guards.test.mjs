import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

test("global CSS is imported only by the App Router layout", async () => {
  const componentFiles = (await walk(`${root}/components`)).filter((file) => /\.(?:tsx|ts|jsx|js)$/.test(file));
  for (const file of componentFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /(?:import|require\()[^\n]*\.css/, `${file} imports global CSS`);
  }
  const layout = await readFile(`${root}/app/layout.tsx`, "utf8");
  assert.deepEqual(
    [...layout.matchAll(/import "\.\/(.+\.css)";/g)].map((match) => match[1]),
    ["globals.css", "responsive.css", "puzzle-upgrade.css", "visual-upgrade.css", "evidence-upgrade.css"],
  );
});

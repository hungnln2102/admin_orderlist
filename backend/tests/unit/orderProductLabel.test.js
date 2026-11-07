const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../../frontend/node_modules/typescript");
const modules = new Map();

function loadTypeScript(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const evaluate = vm.runInThisContext("(function(require, module, exports) {" + compiled + "\n})", { filename });
  evaluate((specifier) => {
    if (!specifier.startsWith(".")) throw new Error("Unexpected dependency: " + specifier);
    return loadTypeScript(path.resolve(path.dirname(filename), specifier + ".ts"));
  }, loaded, loaded.exports);
  return loaded.exports;
}

const { getDisplayProductName } = loadTypeScript(path.resolve(__dirname, "../../../frontend/src/features/orders/types.ts"));

const cases = [
  ["one month", 1, [], "Adobe Acc Cap", "Adobe_Per--1m", "Adobe Acc Cap (1 thang)"],
  ["twelve months without catalog", 14, [], "Autodesk 1 App", "Autodesk_Per--12m", "Autodesk 1 App (12 thang)"],
  ["leading zero", 1, [], "Adobe Renew", "Adobe_Renew--03M", "Adobe Renew (3 thang)"],
  ["display duration wins over catalog", 1, [{ id: 1, package_product: "Old label", san_pham: "Adobe--12m" }], "Adobe Renew", "Adobe--1m", "Adobe Renew (1 thang)"],
  ["missing suffix", 1, [], "GoogleOne goi 100gb", "GoogleOne_100gb", "GoogleOne goi 100gb"],
  ["zero is not a valid month count", 1, [], "Adobe Renew", "Adobe--0m", "Adobe Renew"],
  ["existing duration is not duplicated", 1, [], "Adobe (12 thang)", "Adobe--12m", "Adobe (12 thang)"],
  ["missing display preserves variant", 1, [], "Adobe Renew", undefined, "Adobe Renew"],
  ["missing id still uses names", undefined, [], "Adobe Renew", "Adobe--6m", "Adobe Renew (6 thang)"],
];
for (const [name, id, catalog, variant, display, expected] of cases) {
  test("order product label: " + name, () => {
    const localizedVariant = variant.replaceAll("thang", "th\u00e1ng");
    assert.equal(getDisplayProductName(id, catalog, localizedVariant, display), expected.replaceAll("thang", "th\u00e1ng"));
  });
}

test("order product label retains legacy catalog fallback", () => {
  assert.equal(getDisplayProductName(1, [{ id: 1, package_product: "Adobe", san_pham: "Adobe--12m" }]), "Adobe (12 th\u00e1ng)");
});


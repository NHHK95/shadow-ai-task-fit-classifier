/**
 * scripts/eval-static.js
 *
 * Assignment 5 (INFOSYS 720): STATIC ANALYSIS (Hevner et al., 2004, "examine structure of
 * artefact for static qualities, e.g. complexity"). Zero npm dependencies: it parses the
 * code with the acorn parser that is bundled INSIDE Node itself, which Node only exposes
 * under a flag:
 *
 *     node --expose-internals scripts/eval-static.js
 *
 * Measures per file: physical / code / comment / blank lines, function count, McCabe
 * cyclomatic complexity per function (1 + decision points), maximum function length, and
 * maximum block nesting. Also reports require() dependencies, exports never used elsewhere
 * (possible dead code), and duplicated validation logic in server.js.
 */
const fs = require("fs");
const path = require("path");

let acorn;
try {
  acorn = require("internal/deps/acorn/acorn/dist/acorn");
} catch (e) {
  console.error("Run with:  node --expose-internals scripts/eval-static.js");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const FILES = [
  "server.js",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => f.endsWith(".js")).sort().map((f) => `lib/${f}`),
  "public/app.js",
];

const BUILTIN = new Set(["http", "fs", "path", "url", "node:test", "node:assert/strict", "node:http"]);

function countLines(src) {
  let blank = 0, comment = 0, code = 0, inBlock = false;
  for (const raw of src.split("\n")) {
    const l = raw.trim();
    if (l === "") { blank++; continue; }
    if (inBlock) { comment++; if (l.includes("*/")) inBlock = false; continue; }
    if (l.startsWith("//")) { comment++; continue; }
    if (l.startsWith("/*")) { comment++; if (!l.includes("*/")) inBlock = true; continue; }
    code++;
  }
  return { physical: src.split("\n").length, code, comment, blank };
}

function analyse(file) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", locations: true });
  const functions = [];
  const requires = [];
  let maxNesting = 0;

  const isFn = (n) => n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression";

  function nameOf(node, parent) {
    if (node.id && node.id.name) return node.id.name;
    if (parent && parent.type === "VariableDeclarator" && parent.id.name) return parent.id.name;
    if (parent && parent.type === "Property" && parent.key.name) return parent.key.name;
    if (parent && parent.type === "CallExpression") {
      const c = parent.callee;
      return `<callback of ${c.property ? c.property.name : c.name || "call"}>`;
    }
    return "<anonymous>";
  }

  // complexity of ONE function, not descending into nested functions
  function complexity(fnNode) {
    let cc = 1;
    (function walk(n, depth) {
      if (!n || typeof n.type !== "string") return;
      let d = depth;
      switch (n.type) {
        case "IfStatement": case "ForStatement": case "ForInStatement": case "ForOfStatement":
        case "WhileStatement": case "DoWhileStatement": case "CatchClause": case "ConditionalExpression":
          cc++; d++; break;
        case "SwitchCase": if (n.test) cc++; break;
        case "LogicalExpression": cc++; break;
      }
      if (d > maxFnNesting) maxFnNesting = d;
      for (const k of Object.keys(n)) {
        if (k === "type" || k === "loc" || k === "start" || k === "end") continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach((c) => { if (c && typeof c.type === "string" && !isFn(c)) walk(c, d); });
        else if (v && typeof v.type === "string" && !isFn(v)) walk(v, d);
      }
    })(fnNode.body, 0);
    return cc;
  }
  let maxFnNesting = 0;

  (function visit(n, parent) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "CallExpression" && n.callee.name === "require" && n.arguments[0] && n.arguments[0].type === "Literal") {
      requires.push(n.arguments[0].value);
    }
    if (isFn(n)) {
      maxFnNesting = 0;
      const cc = complexity(n);
      functions.push({
        name: nameOf(n, parent),
        line: n.loc.start.line,
        lines: n.loc.end.line - n.loc.start.line + 1,
        complexity: cc,
        nesting: maxFnNesting,
      });
      if (maxFnNesting > maxNesting) maxNesting = maxFnNesting;
    }
    for (const k of Object.keys(n)) {
      if (k === "type" || k === "loc" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && visit(c, n));
      else if (v && typeof v.type === "string") visit(v, n);
    }
  })(ast, null);

  const named = functions.filter((f) => !f.name.startsWith("<"));
  return {
    file,
    lines: countLines(src),
    functions: functions.length,
    maxComplexity: Math.max(0, ...functions.map((f) => f.complexity)),
    meanComplexity: functions.length ? +(functions.reduce((a, f) => a + f.complexity, 0) / functions.length).toFixed(2) : 0,
    maxFunctionLines: Math.max(0, ...functions.map((f) => f.lines)),
    maxNesting,
    requires,
    topFunctions: functions.slice().sort((a, b) => b.complexity - a.complexity).slice(0, 3),
    namedFunctions: named.map((f) => f.name),
    src,
  };
}

const results = FILES.map(analyse);

// ---- dependencies
const external = new Set();
const local = new Set();
for (const r of results) for (const m of r.requires) {
  if (m.startsWith(".")) local.add(m);
  else if (!BUILTIN.has(m)) external.add(m);
}
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

// ---- exported-but-unused names (possible dead code)
const unused = [];
for (const r of results.filter((x) => x.file.startsWith("lib/"))) {
  const m = r.src.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
  if (!m) continue;
  const names = m[1].split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
  for (const name of names) {
    const usedElsewhere = results.some((o) => o.file !== r.file && new RegExp(`\\b${name}\\b`).test(o.src));
    const consumers = ["scripts", "test"].flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(ROOT, d, f), "utf8")) : []));
    const usedInScripts = consumers.some((src) => new RegExp(`\\b${name}\\b`).test(src));
    if (!usedElsewhere) unused.push(`${r.file}: ${name}${usedInScripts ? " (consumed only by scripts/tests)" : " (internal only: no consumer outside its own module)"}`);
  }
}

// ---- duplicated validation in server.js
const server = results.find((r) => r.file === "server.js").src;
const dupMsgs = ["Please describe the task.", "Please name the tool being used."];
const duplicates = dupMsgs.map((m) => ({ message: m, occurrences: server.split(m).length - 1 })).filter((d) => d.occurrences > 1);

// ---- print
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("file", 26) + pad("LOC(code)", 11) + pad("comment", 9) + pad("funcs", 7) + pad("maxCC", 7) + pad("meanCC", 8) + pad("maxFnLines", 12) + "nesting");
let tot = { code: 0, comment: 0, physical: 0, funcs: 0 };
for (const r of results) {
  console.log(pad(r.file, 26) + pad(r.lines.code, 11) + pad(r.lines.comment, 9) + pad(r.functions, 7) + pad(r.maxComplexity, 7) + pad(r.meanComplexity, 8) + pad(r.maxFunctionLines, 12) + r.maxNesting);
  tot.code += r.lines.code; tot.comment += r.lines.comment; tot.physical += r.lines.physical; tot.funcs += r.functions;
}
console.log(pad("TOTAL", 26) + pad(tot.code, 11) + pad(tot.comment, 9) + pad(tot.funcs, 7));
const all = results.flatMap((r) => r.topFunctions.map((f) => ({ ...f, file: r.file })));
all.sort((a, b) => b.complexity - a.complexity);
console.log("\nMost complex functions:");
all.slice(0, 5).forEach((f) => console.log(`  CC=${f.complexity}  ${f.file}:${f.line}  ${f.name} (${f.lines} lines)`));
console.log("\nRuntime dependencies declared in package.json:", Object.keys(pkg.dependencies || {}).length);
console.log("Third-party modules require()d in source:", external.size ? [...external].join(", ") : "none (Node built-ins and local modules only)");
console.log("Local module imports:", local.size);
console.log("\nPublic surface wider than needed (exports with no consumer in other source files):");
unused.length ? unused.forEach((u) => console.log("  - " + u)) : console.log("  none");
console.log("\nDuplicated validation messages in server.js:");
duplicates.length ? duplicates.forEach((d) => console.log(`  - "${d.message}" appears ${d.occurrences}x`)) : console.log("  none");

fs.mkdirSync(path.join(ROOT, "eval-results"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "eval-results", "static.json"), JSON.stringify({
  totals: tot,
  files: results.map(({ src, namedFunctions, requires, ...rest }) => rest),
  runtimeDependencies: Object.keys(pkg.dependencies || {}).length,
  thirdPartyRequires: [...external],
  unusedExports: unused,
  duplicatedValidation: duplicates,
}, null, 2));
console.log("\nWrote eval-results/static.json");

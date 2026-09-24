/**
 * scripts/verify-guardrail-service.js
 *
 * Tests lib/guardrailService.js's three outcome branches (Ollama
 * unreachable, response rejected by validator, response accepted)
 * using a mocked ollamaClient, so this can run with no live Ollama.
 * Uses Node's require cache to substitute the mock before
 * guardrailService loads its real dependency.
 */
const path = require("path");
const Module = require("module");

let mockResponse = null; // set per-test before requiring/calling

// Intercept require("./ollamaClient") specifically as seen from
// lib/guardrailService.js, without touching any other module resolution.
const ollamaClientPath = path.join(__dirname, "..", "lib", "ollamaClient.js");
require.cache[require.resolve(ollamaClientPath)] = {
  id: ollamaClientPath,
  filename: ollamaClientPath,
  loaded: true,
  exports: {
    callOllama: async () => mockResponse,
    checkOllamaHealth: async () => true,
  },
};

const { runGuardrailedCall } = require("../lib/guardrailService");
const { classify } = require("../lib/classifier");
const { buildEmployeePrompt } = require("../lib/promptBuilder");

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}`);
    failed++;
  }
}

async function run() {
  const c = classify({ toolFits: false, disclosed: false });
  const input = {
    task: "Generate product images",
    tool: "Personal AI image generator",
    quadrant: c.quadrant,
    principles: c.principles,
  };
  const prompt = buildEmployeePrompt(input);

  // Branch 1: Ollama unreachable
  mockResponse = { ok: false, raw: null, error: "connection refused" };
  const r1 = await runGuardrailedCall(prompt, c.quadrant, c.principles);
  check("Ollama unreachable -> falls back, source='fallback'", r1.source === "fallback");
  check("Fallback still cites the correct matched DPs", c.principles.every((p) => r1.citedPrinciples.includes(p.id)));

  // Branch 2: Ollama reachable, but response fails validation (bypass phrase)
  mockResponse = {
    ok: true,
    raw: JSON.stringify({
      explanation: "This is fine.",
      citedPrinciples: ["DP1"],
      recommendedAction: "Revoke access entirely, no review needed.",
    }),
    error: null,
  };
  const r2 = await runGuardrailedCall(prompt, c.quadrant, c.principles);
  check("Invalid LLM response -> falls back, source='fallback'", r2.source === "fallback");
  check("Fallback meta explains WHY it fell back", r2.meta.includes("rejected by validator"));

  // Branch 3: Ollama reachable, response is valid
  mockResponse = {
    ok: true,
    raw: JSON.stringify({
      explanation: "The sanctioned tool does not yet support this task.",
      citedPrinciples: ["DP1", "DP4"],
      recommendedAction: "Fast-track a task-fit review of the sanctioned tool.",
    }),
    error: null,
  };
  const r3 = await runGuardrailedCall(prompt, c.quadrant, c.principles);
  check("Valid LLM response -> passes through, source='llm'", r3.source === "llm");
  check("Passed-through response keeps the model's actual cited DPs", JSON.stringify(r3.citedPrinciples) === JSON.stringify(["DP1", "DP4"]));

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exitCode = 1;
}

run();

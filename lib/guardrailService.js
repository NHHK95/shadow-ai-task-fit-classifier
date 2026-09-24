/**
 * lib/guardrailService.js
 *
 * Orchestrates one full guardrail cycle: call Ollama with a built prompt,
 * validate the response, and fall back to a safe static template if
 * anything goes wrong (unreachable Ollama, malformed JSON, invalid
 * citations, or bypass language). Every route in server.js that talks
 * to the LLM goes through this single function, so the
 * try-LLM-then-fall-back-safely behaviour is implemented exactly once.
 */
const { callOllama } = require("./ollamaClient");
const { validateResponse } = require("./validator");
const { buildFallbackExplanation } = require("./fallbackTemplates");

/**
 * @param {Object} promptPair - { system, user } from promptBuilder.js
 * @param {Object} quadrant - the matched quadrant (for fallback text)
 * @param {Object[]} matchedPrinciples - principles applicable to this case
 * @returns {Promise<Object>} the response to send to the client, always
 *   containing { source: "llm"|"fallback", explanation, citedPrinciples,
 *   recommendedAction }, plus a "meta" field explaining what happened,
 *   useful for the UI to show which path was taken.
 */
async function runGuardrailedCall(promptPair, quadrant, matchedPrinciples) {
  const { ok, raw, error } = await callOllama(promptPair);

  if (!ok) {
    return {
      ...buildFallbackExplanation(quadrant, matchedPrinciples),
      meta: `Ollama unreachable (${error}) -- showing pre-written safe answer.`,
    };
  }

  const validation = validateResponse(raw, matchedPrinciples);

  if (!validation.valid) {
    return {
      ...buildFallbackExplanation(quadrant, matchedPrinciples),
      meta: `LLM response rejected by validator (${validation.reason}) -- showing pre-written safe answer.`,
    };
  }

  return {
    source: "llm",
    explanation: validation.parsed.explanation,
    citedPrinciples: validation.parsed.citedPrinciples,
    recommendedAction: validation.parsed.recommendedAction,
    meta: "LLM response validated successfully.",
  };
}

module.exports = { runGuardrailedCall };

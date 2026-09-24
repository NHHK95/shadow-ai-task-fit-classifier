/**
 * lib/fallbackTemplates.js
 *
 * Generates a safe, static, DP-grounded explanation directly from the
 * classification result, with no LLM involved at all. This is what
 * every use case falls back to when the LLM response fails validation
 * (or Ollama is unreachable), so the app can never show a broken or
 * ungoverned response to the user.
 *
 * Deliberately template-based, not generative: every sentence traces
 * to a specific matched Design Principle, verbatim from Table 3.
 */

function buildFallbackExplanation(quadrant, principles) {
  const principleList = principles.map((p) => p.id).join(", ");
  const leadPrinciple = principles[0];

  return {
    source: "fallback",
    explanation: `This case was classified as ${quadrant.name} (${quadrant.description}). ` +
      `${principles.length} design principle(s) apply: ${principleList}.`,
    citedPrinciples: principles.map((p) => p.id),
    recommendedAction: leadPrinciple
      ? `${leadPrinciple.text}`
      : "Refer this case to the policy team for manual review.",
  };
}

function buildFallbackComparison(quadrant, principles) {
  return {
    baseline: {
      source: "fallback",
      explanation: "No guardrail-free baseline is available in fallback mode.",
      citedPrinciples: [],
      recommendedAction: "Not applicable in fallback mode.",
    },
    guardrailed: buildFallbackExplanation(quadrant, principles),
  };
}

module.exports = { buildFallbackExplanation, buildFallbackComparison };

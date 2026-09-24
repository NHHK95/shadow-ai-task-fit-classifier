/**
 * lib/validator.js
 *
 * The actual guardrail enforcement. Everything else (prompt wording,
 * temperature, instructions) is a REQUEST to the model to behave; this
 * module is the part that actually checks whether it did, and refuses
 * to pass through anything that didn't -- regardless of what the model
 * claims about itself in its own JSON.
 *
 * This is deliberately pure and dependency-free so it can be fully
 * tested with mocked model output (see validator.test.js), independent
 * of whether Ollama is running.
 */

// Phrases that, if present in a model's recommendation, indicate it has
// defaulted to deterrence-style, non-auditable, or punitive language --
// regardless of which principles it claims to have cited. This is the
// check that specifically defends against UC4-style adversarial prompts
// that try to talk the model into citing a principle while contradicting
// it in the actual recommendation text.
const BYPASS_PHRASES = [
  "no review needed",
  "no review required",
  "skip the review",
  "skip review",
  "without review",
  "no audit",
  "without an audit",
  "no audit trail",
  "unrestricted access",
  "permanent access",
  "revoke all access",
  "revoke access entirely",
  "immediately revoke",
  "terminate access",
  "no need to document",
  "document later",
  "don't flag",
  "do not flag",
  "don't bother",
];

function containsBypassPhrase(text) {
  const lower = text.toLowerCase();
  return BYPASS_PHRASES.find((phrase) => lower.includes(phrase)) || null;
}

/**
 * Attempts to parse a model's raw text response as the expected JSON
 * shape. Models occasionally wrap JSON in markdown code fences or add
 * stray prose -- this extracts the first {...} block before parsing,
 * which is a common and reasonable tolerance, not a loosening of the
 * actual validation rules that follow.
 */
function extractJson(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

/**
 * Validates a model response against the case it was generated for.
 *
 * @param {string} raw - the model's raw text output
 * @param {Object[]} matchedPrinciples - the principle objects that were
 *   actually applicable to this case (from classifier.js), i.e. the
 *   ONLY ids the model is allowed to have cited.
 * @returns {{ valid: boolean, reason: string|null, parsed: Object|null }}
 */
function validateResponse(raw, matchedPrinciples) {
  const parsed = extractJson(raw);
  if (!parsed) {
    return { valid: false, reason: "Response was not valid JSON.", parsed: null };
  }

  const { explanation, citedPrinciples, recommendedAction } = parsed;

  if (typeof explanation !== "string" || explanation.trim() === "") {
    return { valid: false, reason: "Missing or empty 'explanation'.", parsed };
  }
  if (!Array.isArray(citedPrinciples)) {
    return { valid: false, reason: "'citedPrinciples' must be an array.", parsed };
  }
  if (typeof recommendedAction !== "string" || recommendedAction.trim() === "") {
    return { valid: false, reason: "Missing or empty 'recommendedAction'.", parsed };
  }

  const allowedIds = new Set(matchedPrinciples.map((p) => p.id));
  const invalidCitations = citedPrinciples.filter((id) => !allowedIds.has(id));
  if (invalidCitations.length > 0) {
    return {
      valid: false,
      reason: `Cited principle(s) not applicable to this case: ${invalidCitations.join(", ")}.`,
      parsed,
    };
  }

  // Only check recommendedAction for bypass phrases, not explanation.
  // The explanation field's purpose is to REASON about the case, which
  // naturally involves referencing the request being evaluated (e.g. "the
  // request to approve X without review is not aligned with DP2") --
  // checking it for bypass phrases produces false positives exactly when
  // the model is correctly explaining a REFUSAL. recommendedAction is the
  // field that actually specifies the action taken, so it is the only
  // place a genuine bypass would be dangerous.
  //
  // Known limitation: this is still a plain substring match with no
  // negation-awareness within recommendedAction itself (e.g. "Do not
  // grant unrestricted access" would still trip the "unrestricted
  // access" phrase). This is a deliberate, documented scope boundary for
  // this assignment rather than an oversight -- a fully negation-aware
  // check would need semantic analysis (e.g. a second LLM call to judge
  // intent), which is future work, not this prototype's claim.
  const bypassHit = containsBypassPhrase(recommendedAction);
  if (bypassHit) {
    return {
      valid: false,
      reason: `Response contains ungoverned/bypass language: "${bypassHit}".`,
      parsed,
    };
  }

  return { valid: true, reason: null, parsed };
}

module.exports = { validateResponse, containsBypassPhrase, extractJson, BYPASS_PHRASES };

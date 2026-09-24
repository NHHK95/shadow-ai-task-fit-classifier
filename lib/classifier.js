/**
 * lib/classifier.js
 *
 * Operationalises Artefact 1 (Shadow AI Workaround Typology, Table 1) and
 * Artefact 3 (Empowerment-Based Design Principles, Table 3) from
 * "Compliance or Convenience? Reducing Shadow AI Adoption in Cloud-Native
 * Organisations" (INFOSYS 720, Assignment 3).
 *
 * This module contains no framework code — it is a pure, unit-testable
 * mapping of (task-fit, disclosure) inputs to a typology quadrant and a
 * set of matching design principles, exactly as defined in Table 1 and
 * Table 3 of the paper. Keeping it framework-free is deliberate: it is
 * the "logical data processing" component required by the Assignment 4
 * specification, and its correctness can be demonstrated independently
 * of the web layer (see classifier.test.js).
 */

// ---------------------------------------------------------------------
// Artefact 1: the four typology quadrants (Table 1)
// ---------------------------------------------------------------------
const QUADRANTS = {
  HABITUAL_DRIFT: {
    id: "habitual_drift",
    name: "Habitual Drift",
    complianceOrientation: "Low",
    convenienceOrientation: "Low",
    description:
      "Numerous, low-value, concealed deviations (e.g., habitual use of a " +
      "personal AI extension for marginal gains).",
  },
  SILENT_SUBSTITUTION: {
    id: "silent_substitution",
    name: "Silent Substitution",
    complianceOrientation: "Low",
    convenienceOrientation: "High",
    description:
      "Concealed, high-value deviations (e.g., quietly replacing a poorly " +
      "fitting sanctioned tool for drafting or coding); greatest task-fit " +
      "signal, lowest visibility.",
  },
  TOLERATED_USE: {
    id: "tolerated_use",
    name: "Tolerated Use",
    complianceOrientation: "High",
    convenienceOrientation: "Low",
    description:
      "Disclosed, low-value deviations, informally acknowledged without " +
      "being perceived as high risk.",
  },
  NEGOTIATED_CIRCUMVENTION: {
    id: "negotiated_circumvention",
    name: "Negotiated Circumvention",
    complianceOrientation: "High",
    convenienceOrientation: "High",
    description:
      "Disclosed, high-value deviations, openly normalised within a team, " +
      "sometimes with tacit managerial approval.",
  },
};

// ---------------------------------------------------------------------
// Artefact 3: the five design principles (Table 3)
// ---------------------------------------------------------------------
const DESIGN_PRINCIPLES = {
  DP1: {
    id: "DP1",
    text:
      "Bring sanctioned pathways to task-fit parity with popular " +
      "unsanctioned tools before attempting restriction.",
    grounding: "Task-Technology Fit (Goodhue & Thompson, 1995)",
    appliesTo: "always",
  },
  DP2: {
    id: "DP2",
    text: "Make policy exceptions auditable and low-friction rather than blocked outright.",
    grounding: "General Deterrence Theory (Straub, 1990)",
    appliesTo: "always",
  },
  DP3: {
    id: "DP3",
    text:
      "Fast-track disclosed, high-compliance-orientation workarounds " +
      "(Tolerated Use, Negotiated Circumvention) into formal review.",
    grounding: "Artefact 1 typology; Protection Motivation Theory (Rogers, 1975)",
    appliesTo: "disclosed",
  },
  DP4: {
    id: "DP4",
    text:
      "Treat concealed, low-compliance-orientation workarounds (Habitual " +
      "Drift, Silent Substitution) as urgent task-fit diagnostic signal, " +
      "not solely disciplinary matters.",
    grounding: "Artefact 1 typology; Protection Motivation Theory (Rogers, 1975)",
    appliesTo: "concealed",
  },
  DP5: {
    id: "DP5",
    text:
      "Evaluate governance interventions against both compliance and " +
      "operational usability outcomes, not compliance alone.",
    grounding: "Task-Technology Fit (Goodhue & Thompson, 1995)",
    appliesTo: "always",
  },
};

/**
 * Classify a workaround instance per Table 1.
 *
 * @param {Object} input
 * @param {boolean} input.toolFits - true if the sanctioned tool is fully
 *   available and fit for the task (drives Convenience Orientation).
 * @param {boolean} input.disclosed - true if the employee has told anyone
 *   about the workaround (drives Compliance Orientation).
 * @returns {Object} the matched quadrant object from QUADRANTS.
 */
function classifyQuadrant({ toolFits, disclosed }) {
  const convenienceOrientation = toolFits ? "Low" : "High";
  const complianceOrientation = disclosed ? "High" : "Low";

  if (complianceOrientation === "Low" && convenienceOrientation === "Low") {
    return QUADRANTS.HABITUAL_DRIFT;
  }
  if (complianceOrientation === "Low" && convenienceOrientation === "High") {
    return QUADRANTS.SILENT_SUBSTITUTION;
  }
  if (complianceOrientation === "High" && convenienceOrientation === "Low") {
    return QUADRANTS.TOLERATED_USE;
  }
  return QUADRANTS.NEGOTIATED_CIRCUMVENTION;
}

/**
 * Map a quadrant to its applicable design principles, per Table 3.
 * DP1, DP2 and DP5 apply universally; DP3 applies to disclosed
 * quadrants; DP4 applies to concealed quadrants.
 *
 * @param {Object} quadrant - a quadrant object from QUADRANTS.
 * @returns {Object[]} ordered array of matching design principle objects.
 */
function matchDesignPrinciples(quadrant) {
  const isDisclosed = quadrant.complianceOrientation === "High";
  const principles = [DESIGN_PRINCIPLES.DP1, DESIGN_PRINCIPLES.DP2];
  principles.push(isDisclosed ? DESIGN_PRINCIPLES.DP3 : DESIGN_PRINCIPLES.DP4);
  principles.push(DESIGN_PRINCIPLES.DP5);
  return principles;
}

/**
 * Full classification pipeline: Artefact 1 -> Artefact 3.
 *
 * @param {Object} input - see classifyQuadrant.
 * @returns {Object} { quadrant, principles }
 */
function classify(input) {
  const quadrant = classifyQuadrant(input);
  const principles = matchDesignPrinciples(quadrant);
  return { quadrant, principles };
}

module.exports = {
  QUADRANTS,
  DESIGN_PRINCIPLES,
  classifyQuadrant,
  matchDesignPrinciples,
  classify,
};

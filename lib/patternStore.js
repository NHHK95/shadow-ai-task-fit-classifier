/**
 * lib/patternStore.js
 *
 * A minimal, in-memory operationalisation of the Assess -> Policy
 * Blindspot relationship (H2) from Artefact 2 (Shadow AI Workaround
 * Feedback Loop Model, Table 2). This does not implement the full
 * five-construct loop -- that scope is intentionally left to the
 * system architecture diagram (Assignment 4, Artefact 1) rather than
 * this proof-of-concept -- but it gives the feedback-loop idea a real,
 * executable presence: repeated identical submissions are treated as
 * evidence of a recurring Policy Blindspot, exactly as H2 proposes
 * ("Identified policy blindspots concentrate in processes exhibiting
 * the largest task-technology fit gaps").
 *
 * Storage is a plain in-memory Map, which resets on server restart.
 * This is a deliberate scope decision for a course-assignment proof of
 * concept, not a production design; a persistent Data Layer is shown
 * instead in the accompanying system architecture diagram.
 */

const submissions = new Map();

const BLINDSPOT_THRESHOLD = 3;

function normaliseKey(task, tool) {
  return `${task.trim().toLowerCase()}::${tool.trim().toLowerCase()}`;
}

/**
 * Record a submission and return how many times this exact
 * (task, tool) pair has now been reported.
 */
function recordSubmission(task, tool) {
  const key = normaliseKey(task, tool);
  const count = (submissions.get(key) || 0) + 1;
  submissions.set(key, count);
  return count;
}

/**
 * Given a report count, decide whether a Policy Blindspot flag
 * should be raised (H2) and return the message to show, or null.
 */
function checkBlindspot(count) {
  if (count < BLINDSPOT_THRESHOLD) return null;
  return (
    `This exact gap has now been reported ${count} times. Per H2 ` +
    `("identified policy blindspots concentrate in processes exhibiting ` +
    `the largest task-technology fit gaps"), this pattern indicates a ` +
    `Policy Blindspot — a policy review is recommended.`
  );
}

function reset() {
  submissions.clear();
}

module.exports = { recordSubmission, checkBlindspot, reset, BLINDSPOT_THRESHOLD };

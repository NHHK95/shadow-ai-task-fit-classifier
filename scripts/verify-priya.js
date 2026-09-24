/**
 * scripts/verify-priya.js
 *
 * Sanity check: the paper's own worked scenario says Priya's case
 * (sanctioned tool cannot do the task; use is concealed) should
 * classify as Silent Substitution, and should surface DP1 and DP4
 * among the matched design principles. This script asserts that the
 * classifier module reproduces that result exactly.
 *
 * Run with: node scripts/verify-priya.js
 */
const { classify } = require("../lib/classifier");

const result = classify({ toolFits: false, disclosed: false });

console.log("Quadrant:", result.quadrant.name);
console.log(
  "Design Principles:",
  result.principles.map((p) => p.id).join(", ")
);

const expectedQuadrant = "Silent Substitution";
const expectedPrinciples = ["DP1", "DP4"];

let ok = true;

if (result.quadrant.name !== expectedQuadrant) {
  console.error(
    `FAIL: expected quadrant "${expectedQuadrant}", got "${result.quadrant.name}"`
  );
  ok = false;
}

const gotIds = result.principles.map((p) => p.id);
for (const id of expectedPrinciples) {
  if (!gotIds.includes(id)) {
    console.error(`FAIL: expected ${id} to be among matched principles, got [${gotIds}]`);
    ok = false;
  }
}

if (ok) {
  console.log("\nPASS: classifier reproduces the paper's Priya scenario exactly.");
  process.exit(0);
} else {
  process.exit(1);
}

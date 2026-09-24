# Task-Fit Classifier

A proof-of-concept system artefact for INFOSYS 720 Assignment 4 (Design Phase).

Operationalises two of the three conceptual artefacts from Assignment 3
("Compliance or Convenience? Reducing Shadow AI Adoption in Cloud-Native
Organisations"):

- **Artefact 1 — Shadow AI Workaround Typology (Table 1):** implemented in
  `lib/classifier.js` as `classifyQuadrant()`. Classifies a workaround
  instance into one of four quadrants based on whether the sanctioned tool
  fits the task (Convenience Orientation) and whether the workaround is
  disclosed (Compliance Orientation).
- **Artefact 3 — Empowerment-Based Design Principles (Table 3):**
  implemented as `matchDesignPrinciples()`. Maps the matched quadrant to
  the Design Principles (DP1–DP5) that apply to it, exactly per Table 3's
  own stated scope for each principle.
- **Artefact 2 — Feedback Loop Model (Table 2), lightweight instance:**
  `lib/patternStore.js` implements the Assess → Policy Blindspot
  relationship (proposition H2): three or more identical submissions
  trigger a blindspot warning in the UI.

## Requirements

- Node.js 18 or later. **No `npm install` step and no other dependencies
  are required** — the server uses only Node's built-in `http` module,
  deliberately, so it runs identically on any machine with Node installed.

## Running it

```bash
node server.js
```

Then open **http://localhost:4000** in any modern browser.

If port 4000 is also in use, override it: `PORT=5050 node server.js`.

## Verifying the logic independently of the web UI

```bash
node scripts/verify-priya.js
```

This asserts that the classifier reproduces the Assignment 3 paper's own
worked scenario (Priya, the marketing coordinator) exactly: a concealed
workaround for a task the sanctioned tool cannot handle should classify as
**Silent Substitution** and surface **DP1** and **DP4** among the matched
design principles. Expected output:

```
Quadrant: Silent Substitution
Design Principles: DP1, DP2, DP4, DP5

PASS: classifier reproduces the paper's Priya scenario exactly.
```

## Project structure

```
shadow-ai-classifier/
├── server.js              Zero-dependency HTTP server (2 routes)
├── lib/
│   ├── classifier.js       Artefact 1 + Artefact 3 logic (pure functions)
│   └── patternStore.js     Artefact 2 pattern-detection (in-memory)
├── public/
│   ├── index.html          Form + live quadrant visualisation
│   ├── style.css
│   └── app.js               Fetches /api/classify, renders the result
├── scripts/
│   └── verify-priya.js     Regression test against the paper's own example
└── package.json
```

## Scope notes (for the Design Rationale section)

- Storage is in-memory (a JS `Map`) and resets on restart. This is a
  deliberate scope decision for a course-assignment proof of concept; a
  persistent Data Layer is shown instead in the accompanying System
  Architecture diagram (Artefact 1 of this assignment).
- The full five-construct feedback loop (Compliance Failures → Policy
  Blindspots → Vulnerable Processes → Shadow AI Workarounds →
  Workaround-Aware Support Artefacts) is not fully implemented end-to-end
  here; this proof of concept implements the first relationship (Assess,
  H2) as a real, executable instance of the pattern, with the full loop
  left to the system architecture diagram and future Design/Evaluate
  phases.

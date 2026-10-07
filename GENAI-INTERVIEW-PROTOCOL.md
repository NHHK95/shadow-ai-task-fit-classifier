# GenAI interview protocol (Assignment 5, conceptual artefact: Shadow AI Workaround Typology)

Purpose: Hevner et al. (2004) *Observational* evaluation of the typology, using a GenAI model as an
independent informant. Use a model **other than Claude** (e.g. ChatGPT, Gemini, Copilot), because Claude
helped build the proof of concept and should not also be the evaluator.

## Set-up (record all of this in the report)
- Open a **new chat** with no memory, custom instructions or uploaded files.
- Write down: model name and version shown in the app, date and time, whether web search was on.
- Paste each message below **exactly as written**, one at a time. Do not add hints or correct the model.
- Copy the full transcript into a file. It goes in an appendix (or a shortened version in a table).

## Message 0: context (paste first)

> You are an independent reviewer with expertise in information systems research and information security
> behaviour. I will describe a conceptual artefact from a design science research project and then ask you
> a series of questions. Judge it critically; I want weaknesses as much as strengths. Answer each question
> separately and concisely (under 200 words each unless I ask for more).
>
> **Artefact: Shadow AI Workaround Typology.** A shadow AI workaround is a goal-driven deviation from
> prescribed information security policy in which an employee substitutes, augments or circumvents a
> sanctioned information system with an unsanctioned generative AI tool to complete a task, motivated by a
> perceived gap between the task fit of sanctioned tools and organisational productivity expectations.
> Workarounds are classified on two dimensions. **Compliance Orientation** is whether the workaround is
> concealed from (Low) or disclosed to (High) the organisation. **Convenience Orientation** is the size of
> the perceived task-fit gain the unsanctioned tool gives over the sanctioned alternative (Low or High).
> Crossing them gives four types: **Habitual Drift** (concealed, low gain), **Silent Substitution**
> (concealed, high gain), **Tolerated Use** (disclosed, low gain) and **Negotiated Circumvention**
> (disclosed, high gain). The typology is grounded in Task-Technology Fit theory (Goodhue & Thompson, 1995)
> for the convenience axis and Protection Motivation Theory (Rogers, 1975) for the concealment/disclosure axis.
> Its intended use is to help a security policy team choose a proportionate, non-punitive governance response
> for each type.

## Questions (ask one at a time, in this order)

1. **Restatement.** Restate the typology in your own words. Which parts, if any, were ambiguous?
2. **Ratings.** Rate each of the following from 1 (poor) to 5 (excellent) and justify each in one or two sentences: (a) clarity of definitions, (b) mutual exclusivity of the four types, (c) collective exhaustiveness, (d) theoretical grounding, (e) generalisability beyond generative AI, (f) usefulness to a security policy team.
3. **Boundary cases.** Give three realistic employee scenarios that would be hard to classify with this typology. For each, say how you would classify it and why it is difficult.
4. **Missing dimensions.** What important dimension, if any, does the typology leave out (for example data sensitivity, frequency, intent)? Would adding it be worth the extra complexity?
5. **Binary axes.** Is it defensible to treat both axes as binary (concealed/disclosed, low/high gain)? What would you change?
6. **Strongest criticism.** Give the strongest criticism of this typology that a proponent of deterrence-based security management would make.
7. **Actionability.** For each of the four types, would a policy team plausibly respond differently? Give one concrete response per type, or say where the types do not justify different responses.
8. **Evidence.** What evidence would convince you that this typology is valid and useful?

## Analysis (done by the researcher after the interview)
Code every substantive point the model made in a table:

| # | Question | Model's point (short quote) | Supports / Challenges / Suggests revision | Researcher response (accept / reject / defer) and reason |
|---|---|---|---|---|

Report: the six ratings from Question 2, the number of points in each category, which points led to a change
in the typology or its limitations section, and which were rejected and why. State the limitations of this
method (a single model, one session, possible agreeableness, no ground truth).

## Optional: human expert interview (1% bonus)
If an academic or practitioner can spare 15 minutes, ask the same Questions 2, 3, 6 and 7 and record the answers
with their consent. Skip this if time is short.

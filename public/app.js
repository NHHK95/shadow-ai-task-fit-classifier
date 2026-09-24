// ============ Shared helpers ============
const QUADRANT_ELEMENT_IDS = {
  "Habitual Drift": "q-habitual_drift",
  "Silent Substitution": "q-silent_substitution",
  "Tolerated Use": "q-tolerated_use",
  "Negotiated Circumvention": "q-negotiated_circumvention",
};

function highlightQuadrant(name) {
  document.querySelectorAll(".quadrant").forEach((el) => el.classList.remove("active"));
  const id = QUADRANT_ELEMENT_IDS[name];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  }
}

function renderSourceBadge(el, source, meta) {
  el.textContent = source === "llm" ? "✓ LLM response (validated)" : "⚠ Fallback (safe pre-written answer)";
  el.className = "source-badge " + (source === "llm" ? "source-llm" : "source-fallback");
  el.title = meta || "";
}

function renderPrincipleList(el, principles) {
  el.innerHTML = "";
  principles.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.id}.</strong> ${p.text}<span class="grounding">${p.grounding}</span>`;
    el.appendChild(li);
  });
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function getRadioValue(form, name) {
  const el = form.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value === "true" : null;
}

// ============ Tab switching ============
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ============ TAB 1: Employee ============
const employeeForm = document.getElementById("employee-form");
employeeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("employee-error");
  errorEl.hidden = true;

  const toolFits = getRadioValue(employeeForm, "toolFits");
  const disclosed = getRadioValue(employeeForm, "disclosed");
  if (toolFits === null || disclosed === null) {
    errorEl.textContent = "Please answer both questions.";
    errorEl.hidden = false;
    return;
  }

  const body = {
    task: employeeForm.task.value,
    tool: employeeForm.tool.value,
    toolFits,
    disclosed,
  };

  try {
    const data = await postJson("/api/explain/employee", body);
    const resultsPanel = document.getElementById("employee-results");
    document.getElementById("employee-result-quadrant").innerHTML =
      `<strong>${data.quadrant.name}</strong><br/>${data.quadrant.description}`;
    renderSourceBadge(document.getElementById("employee-source-badge"), data.result.source, data.result.meta);
    document.getElementById("employee-explanation").textContent = data.result.explanation;
    document.getElementById("employee-action").textContent = data.result.recommendedAction;
    renderPrincipleList(document.getElementById("employee-principles"), data.principles);
    highlightQuadrant(data.quadrant.name);
    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

// ============ TAB 2: Policy Team ============
const policyForm = document.getElementById("policy-form");
policyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("policy-error");
  errorEl.hidden = true;

  const toolFits = getRadioValue(policyForm, "toolFits");
  const disclosed = getRadioValue(policyForm, "disclosed");
  if (toolFits === null || disclosed === null) {
    errorEl.textContent = "Please answer both questions.";
    errorEl.hidden = false;
    return;
  }

  const body = { task: policyForm.task.value, tool: policyForm.tool.value, toolFits, disclosed };

  try {
    const data = await postJson("/api/explain/policy", body);
    const resultsPanel = document.getElementById("policy-results");

    const blindspotEl = document.getElementById("policy-blindspot");
    if (data.blindspotWarning) {
      blindspotEl.hidden = false;
      blindspotEl.textContent = data.blindspotWarning;
    } else {
      blindspotEl.hidden = true;
    }

    renderSourceBadge(document.getElementById("policy-baseline-badge"), data.baseline.source, data.baseline.meta);
    document.getElementById("policy-baseline-explanation").textContent = data.baseline.explanation;
    document.getElementById("policy-baseline-action").textContent = data.baseline.recommendedAction;

    renderSourceBadge(document.getElementById("policy-guardrailed-badge"), data.guardrailed.source, data.guardrailed.meta);
    document.getElementById("policy-guardrailed-explanation").textContent = data.guardrailed.explanation;
    document.getElementById("policy-guardrailed-action").textContent = data.guardrailed.recommendedAction;
    renderPrincipleList(document.getElementById("policy-guardrailed-principles"), data.principles);

    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

// ============ TAB 3: Cross-Org ============
async function loadOrgProfiles() {
  try {
    const res = await fetch("/api/org-profiles");
    const data = await res.json();
    const select = document.getElementById("org-select");
    data.orgs.forEach((org) => {
      const opt = document.createElement("option");
      opt.value = org.key;
      opt.textContent = org.label;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Could not load org profiles:", err);
  }
}
loadOrgProfiles();

const crossOrgForm = document.getElementById("crossorg-form");
crossOrgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("crossorg-error");
  errorEl.hidden = true;

  const toolFits = getRadioValue(crossOrgForm, "toolFits");
  const disclosed = getRadioValue(crossOrgForm, "disclosed");
  if (toolFits === null || disclosed === null) {
    errorEl.textContent = "Please answer both questions.";
    errorEl.hidden = false;
    return;
  }

  const body = {
    task: crossOrgForm.task.value,
    tool: crossOrgForm.tool.value,
    toolFits,
    disclosed,
    orgKey: crossOrgForm.orgKey.value,
  };

  try {
    const data = await postJson("/api/explain/cross-org", body);
    const resultsPanel = document.getElementById("crossorg-results");
    document.getElementById("crossorg-org-heading").textContent = `Result — ${data.orgLabel}`;
    document.getElementById("crossorg-result-quadrant").innerHTML =
      `<strong>${data.quadrant.name}</strong><br/>${data.quadrant.description}`;
    renderSourceBadge(document.getElementById("crossorg-source-badge"), data.result.source, data.result.meta);
    document.getElementById("crossorg-explanation").textContent = data.result.explanation;
    document.getElementById("crossorg-action").textContent = data.result.recommendedAction;
    renderPrincipleList(document.getElementById("crossorg-principles"), data.principles);
    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

// ============ TAB 4: Adversarial Test ============
async function loadAdversarialPrompts() {
  try {
    const res = await fetch("/api/adversarial-prompts");
    const data = await res.json();
    const container = document.getElementById("adversarial-prompt-list");
    data.prompts.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prompt-btn";
      btn.innerHTML = `<strong>${p.id}</strong><span>${p.text}</span>`;
      btn.addEventListener("click", () => runAdversarialPrompt(p.id, p.text));
      container.appendChild(btn);
    });
  } catch (err) {
    console.error("Could not load adversarial prompts:", err);
  }
}
loadAdversarialPrompts();

async function runAdversarialPrompt(promptId, promptText) {
  const errorEl = document.getElementById("adversarial-error");
  errorEl.hidden = true;

  try {
    const data = await postJson("/api/explain/adversarial", { promptId });
    const resultsPanel = document.getElementById("adversarial-results");

    document.getElementById("adversarial-request").textContent = `"${promptText}"`;
    renderSourceBadge(document.getElementById("adversarial-source-badge"), data.result.source, data.result.meta);
    document.getElementById("adversarial-explanation").textContent = data.result.explanation;
    document.getElementById("adversarial-action").textContent = data.result.recommendedAction;

    const checklist = document.getElementById("adversarial-dp-checklist");
    checklist.innerHTML = "";
    data.principles.forEach((p) => {
      const held = data.result.citedPrinciples.includes(p.id);
      const chip = document.createElement("div");
      chip.className = "dp-chip " + (held ? "dp-held" : "dp-not-cited");
      chip.innerHTML = `<strong>${p.id}</strong><span>${held ? "✓ Cited" : "— not cited"}</span>`;
      checklist.appendChild(chip);
    });

    resultsPanel.hidden = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

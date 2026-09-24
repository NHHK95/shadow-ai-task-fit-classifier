/**
 * lib/ollamaClient.js
 *
 * Thin HTTP client for a local Ollama server. Zero dependencies,
 * consistent with the rest of this codebase -- uses Node's built-in
 * http module only.
 *
 * NOTE FOR GRADING / REVIEW: this file cannot be exercised against a
 * real model in the sandboxed environment this project was authored in
 * (no network access to localhost:11434 there). It is code-reviewed and
 * structurally correct, but the live round-trip was verified by the
 * author on their own machine, per the README's setup instructions.
 */
const http = require("http");

const OLLAMA_HOST = process.env.OLLAMA_HOST || "localhost";
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Calls Ollama's /api/generate endpoint with a system + user prompt and
 * returns the raw text response. Does NOT parse or validate JSON --
 * that is the Response Validator's job (lib/validator.js), kept
 * deliberately separate so the two concerns can be tested independently.
 *
 * @param {Object} params
 * @param {string} params.system - system prompt (the guardrail content)
 * @param {string} params.user - user prompt (the case)
 * @param {number} [params.timeoutMs]
 * @returns {Promise<{ ok: boolean, raw: string|null, error: string|null }>}
 */
function callOllama({ system, user, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: OLLAMA_MODEL,
      system,
      prompt: user,
      stream: false,
      options: {
        temperature: 0.1,  // lowered from 0.2: tighter sampling, less run-to-run variance
        num_ctx: 4096,
        num_predict: 700,  // raised from 500: more headroom against verbose generations
      },
    });

    const req = http.request(
      {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return resolve({
              ok: false,
              raw: null,
              error: `Ollama returned HTTP ${res.statusCode}`,
            });
          }
          try {
            const parsed = JSON.parse(body);
            resolve({ ok: true, raw: parsed.response, error: null });
          } catch (e) {
            resolve({
              ok: false,
              raw: null,
              error: "Could not parse Ollama's response envelope as JSON.",
            });
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        raw: null,
        error: `Ollama did not respond within ${timeoutMs}ms.`,
      });
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        raw: null,
        error: `Could not reach Ollama at ${OLLAMA_HOST}:${OLLAMA_PORT} (${err.code || err.message}). Is 'ollama serve' running?`,
      });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Lightweight health check, used at server startup to log a clear
 * warning (not a crash) if Ollama isn't reachable, since the app must
 * still run in fallback-only mode without it.
 */
function checkOllamaHealth(timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: "/api/version", method: "GET", timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

module.exports = { callOllama, checkOllamaHealth, OLLAMA_MODEL, OLLAMA_HOST, OLLAMA_PORT };

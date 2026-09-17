import { z } from "zod";

// The one and only network call site in the app. Server-only (uses a secret API key),
// called from src/app/api/scenario/parse/route.ts and nowhere else.
//
// Hard rule: the model never produces a euro amount that reaches the screen. It only turns
// language into structured objects, or places already-formatted strings into prose.

const MODEL = "claude-haiku-4-5-20251001";
const responseCache = new Map<string, unknown>();

export interface StructuredOptions<T> {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
  cacheKey?: string;
}

export interface StructuredResult<T> {
  data: T;
  source: "llm" | "cache";
  latencyMs: number;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in model output");
  return JSON.parse(match[0]);
}

async function callAnthropic(
  system: string,
  user: string,
  temperature: number,
  timeoutMs: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        temperature,
        system: `${system}\n\nRespond with ONLY a single JSON object. No prose, no markdown fences.`,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const body = await res.json();
    const text = body?.content?.[0]?.text;
    if (typeof text !== "string") throw new Error("Unexpected Anthropic response shape");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cache first, then one LLM attempt, then one repair attempt with the validation error
 * appended, then throw — the caller (an agent) is responsible for the deterministic
 * fallback. Never a third attempt: that's dead air on stage.
 */
export async function structured<T>(opts: StructuredOptions<T>): Promise<StructuredResult<T>> {
  const { schema, system, user, temperature = 0, timeoutMs = 4_000, cacheKey } = opts;
  const started = performance.now();

  if (cacheKey && responseCache.has(cacheKey)) {
    return { data: responseCache.get(cacheKey) as T, source: "cache", latencyMs: 0 };
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt = attempt === 0 ? user : `${user}\n\nYour previous output was invalid: ${String(lastError)}. Fix it and return only valid JSON.`;
      const text = await callAnthropic(system, prompt, temperature, timeoutMs);
      const parsed = schema.parse(extractJson(text));
      if (cacheKey) responseCache.set(cacheKey, parsed);
      return { data: parsed, source: "llm", latencyMs: performance.now() - started };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

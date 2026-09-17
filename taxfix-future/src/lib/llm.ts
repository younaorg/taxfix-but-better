import { z } from "zod";
import { getLlmCache, setLlmCache } from "@/data/prompt-cache";

function isOfflineFlag(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("offline") === "1";
  }
  return process.env.OFFLINE === "1";
}

function zodToJsonSchema(): Record<string, unknown> {
  return { type: "object", additionalProperties: true };
}

export async function structured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  timeoutMs?: number;
  cacheKey?: string;
  temperature?: number;
  offline?: boolean;
}): Promise<{ data: T; source: "llm" | "cache" }> {
  const timeoutMs = opts.timeoutMs ?? 4000;
  if (opts.cacheKey) {
    const hit = getLlmCache<T>(opts.cacheKey);
    if (hit !== undefined) {
      console.log({ agent: "llm", source: "cache", latencyMs: 0, valid: true });
      return { data: hit, source: "cache" };
    }
  }
  if (isOfflineFlag(opts.offline)) {
    throw new Error("offline");
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no_api_key");

  const attempt = async (user: string): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            temperature: opts.temperature ?? 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: opts.system },
              { role: "user", content: user },
            ],
          }),
        },
      );
      if (!res.ok) throw new Error(`llm_http_${res.status}`);
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const raw = json.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as unknown;
      return opts.schema.parse(parsed);
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const data = await attempt(opts.user);
    if (opts.cacheKey) setLlmCache(opts.cacheKey, data);
    console.log({ agent: "llm", source: "llm", latencyMs: timeoutMs, valid: true });
    return { data, source: "llm" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid";
    const data = await attempt(`${opts.user}\n\nValidation error, repair: ${msg}`);
    if (opts.cacheKey) setLlmCache(opts.cacheKey, data);
    return { data, source: "llm" };
  }
}

void zodToJsonSchema;

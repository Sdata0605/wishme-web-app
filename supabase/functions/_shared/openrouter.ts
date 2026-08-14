export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const TEXT_MODEL = "openai/gpt-4o-mini";
export const IMAGE_MODEL = "google/gemini-2.5-flash-image";

const TEXT_FALLBACKS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.1-8b-instruct",
];

export function openRouterKey(): string {
  const key = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return key;
}

export function openRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${openRouterKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://wishme.app",
    "X-Title": "Wish Me",
  };
}

function extractText(data: Record<string, unknown>): string | null {
  const choices = data?.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text || "");
        }
        return "";
      })
      .join("")
      .trim();
    if (joined) return joined;
  }
  return null;
}

function errorMessage(data: Record<string, unknown>, status: number): string {
  const err = data?.error as { message?: string; metadata?: { raw?: string } } | string | undefined;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    if (err.message) return err.message;
    if (err.metadata?.raw) return String(err.metadata.raw).slice(0, 300);
  }
  if (typeof data?.msg === "string") return data.msg;
  return `OpenRouter error ${status}`;
}

export async function openRouterText(
  prompt: string,
  opts?: { system?: string; maxTokens?: number; temperature?: number; model?: string },
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts?.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  const models = opts?.model ? [opts.model, ...TEXT_FALLBACKS.filter((m) => m !== opts.model)] : TEXT_FALLBACKS;
  let lastError = "OpenRouter returned empty text";

  for (const model of models) {
    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts?.maxTokens ?? 1200,
        temperature: opts?.temperature ?? 0.7,
      }),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      lastError = errorMessage(data, res.status);
      console.error("OpenRouter failed", model, res.status, lastError);
      continue;
    }

    const text = extractText(data);
    if (text) return text;
    lastError = `OpenRouter ${model} returned empty text`;
    console.error(lastError, JSON.stringify(data).slice(0, 500));
  }

  throw new Error(lastError);
}

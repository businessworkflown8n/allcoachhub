/** Shared Gemini AI helpers for edge functions (replaces Lovable AI gateway). */

export const AI_CHAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export function getAiApiKey(): string {
  const key =
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("GOOGLE_AI_API_KEY") ||
    Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return key;
}

export function aiAuthHeaders(apiKey?: string): HeadersInit {
  const key = apiKey ?? getAiApiKey();
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** Map legacy Lovable gateway model IDs → Gemini API model IDs */
export function mapAiModel(model: string): string {
  const m = model.replace(/^google\//, "");
  const table: Record<string, string> = {
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-3.1-flash-image-preview": "gemini-2.5-flash",
    "gemini-2.5-flash-image": "gemini-2.5-flash",
    "gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
    "gemini-2.5-flash": "gemini-2.5-flash",
    "gemini-2.0-flash": "gemini-2.0-flash",
  };
  return table[m] || (m.startsWith("gemini-") ? m : "gemini-2.5-flash");
}

export async function aiChatCompletions(
  body: Record<string, unknown>,
  apiKey?: string,
): Promise<Response> {
  const key = apiKey ?? getAiApiKey();
  const payload: Record<string, unknown> = { ...body };
  if (typeof payload.model === "string") {
    payload.model = mapAiModel(payload.model);
  }
  // Lovable-specific image modality fields are not used on Gemini OpenAI compat
  delete payload.modalities;
  return fetch(AI_CHAT_URL, {
    method: "POST",
    headers: aiAuthHeaders(key),
    body: JSON.stringify(payload),
  });
}

/** Native Gemini image generation → data URL */
export async function generateImageDataUrl(
  prompt: string,
  apiKey?: string,
): Promise<string | null> {
  const key = apiKey ?? getAiApiKey();
  const model = "gemini-2.0-flash-preview-image-generation";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!res.ok) {
    console.error("Gemini image error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType || inline.mime_type || "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }
  return null;
}

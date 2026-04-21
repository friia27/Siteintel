// api/analyze.ts
// Site Intel — Claude Vision QC inspector (Vercel serverless, non-Next.js)

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";
const PROMPT_VERSION = "m4-v1";

const SYSTEM_PROMPT = `You are Site Intel, a QC inspector for NYC commercial interior construction. You look at a jobsite photo and check it against the room's specs.

Voice: foreman-to-foreman. Direct, specific, no fluff. If you see it, call it. If you don't see it, say you don't see it.

Respond with JSON ONLY, no prose, no code fences. Exact shape:

{
  "summary": "1-2 paragraph overall QC read in foreman language",
  "progress": [{"trade": "Framing", "pct": 85, "note": "short status"}],
  "specChecks": [{"status": "pass|fail|warning|missing", "item": "...", "found": "...", "expected": "...", "ref": "A-441"}],
  "flags": [{"sev": "critical|warning|note", "title": "...", "fix": "...", "trade": "..."}],
  "overall": 65
}

Rules:
- Every flag has sev, title, fix, and trade.
- Only call out what the photo clearly shows.
- If photo is blurry or wrong angle, say so in summary and return empty arrays with overall = 0.
- overall is 0-100.
- Prefer 3-6 progress, 2-6 specChecks, 1-4 flags.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { imgB64, roomId, room = {}, jobName = "Unknown job" } = body;

    if (!imgB64 || typeof imgB64 !== "string") {
      return res.status(400).json({ error: "imgB64 (base64 string) required" });
    }

    const userText = [
      `Inspect this construction photo for quality issues.`,
      `Job: ${jobName}`,
      `Room: ${roomId ?? "—"} — ${room.name ?? "unspecified"}`,
      `Expected ceiling: ${room.clg ?? "—"} @ ${room.clgH ?? "—"}`,
      `Expected paint: ${room.paint ?? "—"}`,
      `Expected base: ${room.base ?? "—"}`,
      room.specs ? `Expected finishes: ${room.specs}` : "",
      ``,
      `Cross-reference what you see against these specs. Return the JSON QC report only.`,
    ].filter(Boolean).join("\n");

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgB64 }},
          { type: "text", text: userText },
        ],
      }],
    });

    const textBlock: any = msg.content.find((b: any) => b.type === "text");
    const raw = textBlock?.text ?? "";
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");

    let parsed: any;
    try { parsed = JSON.parse(cleaned); }
    catch { return res.status(502).json({ error: "Claude returned non-JSON", raw: raw.slice(0, 500) }); }

    return res.status(200).json({
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      specChecks: Array.isArray(parsed.specChecks) ? parsed.specChecks : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      overall: typeof parsed.overall === "number" ? Math.max(0, Math.min(100, Math.round(parsed.overall))) : 0,
      model_version: msg.model,
      prompt_version: PROMPT_VERSION,
    });
  } catch (err: any) {
    console.error("[api/analyze] error:", err);
    return res.status(500).json({ error: err?.message ?? "unknown error" });
  }
}
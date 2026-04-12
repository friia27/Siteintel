import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { imageBase64, mediaType, jobName, floor, foreman, phase } = await request.json();

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const system = `You are a construction site progress inspector with 20 years of NYC experience. Analyze job site photos and return a structured JSON progress report.

Respond ONLY with a raw JSON object. No markdown fences, no explanation, no preamble. Start with { and end with }.

Required structure:
{
  "overall_pct": <integer 0-100>,
  "summary": "<2-3 sentence foreman-style summary — direct and specific>",
  "trades": [
    {
      "name": "<trade name>",
      "status": "<complete|partial|not-started|not-visible>",
      "pct": <integer 0-100>,
      "notes": "<specific field observation>"
    }
  ]
}

Rules:
- overall_pct is an integer
- Include 7-10 trade items covering what you can and cannot see
- status must be exactly: complete, partial, not-started, or not-visible
- pct is an integer 0-100
- Write like an experienced NYC foreman — no corporate speak
- Be specific about what you see (conduit type, drywall stage, fixture type, etc.)`;

    const userPrompt = `Analyze this construction photo.
Job: ${jobName || "Unknown"}
Zone/Floor: ${floor || "Unspecified"}
Foreman: ${foreman || "Unspecified"}
Phase: ${phase || "unknown"}

Return only the JSON progress report.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract JSON robustly
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Could not parse AI response", raw: rawText }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.trades)) {
      return NextResponse.json({ error: "Invalid report structure from AI" }, { status: 500 });
    }

    return NextResponse.json({ report: parsed });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

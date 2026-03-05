import Anthropic from "@anthropic-ai/sdk";
import type { ClipResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

function buildSystemPrompt(clipCount: number): string {
  return `You are an expert short-form video strategist and viral content analyst. Your job is to identify exactly ${clipCount} clip moments from a transcript that would perform exceptionally well as standalone short clips (TikTok, YouTube Shorts, Instagram Reels).

SELECTION CRITERIA — only pick moments that have ALL of the following:
1. A STRONG HOOK in the first 5 seconds that makes someone stop scrolling
2. An obvious PAYOFF — a punchline, revelation, emotional peak, or resolution
3. Works COMPLETELY STANDALONE with zero prior context needed
4. Has at least one of: clear emotional shift, conflict/tension, surprise twist, punchline, or high stakes moment

AVOID:
- Generic talking head moments with no arc
- Moments that require context from earlier in the video
- Slow buildups with no payoff within the clip window
- Filler content, transitions, or sponsor segments

For each clip, pick a window of 45–90 seconds unless the moment naturally ends sooner.

CATEGORY DEFINITIONS:
- "intense": high stakes, confrontational, shocking, urgent, motivational
- "funny": comedic, absurd, relatable humor, unexpected delivery
- "emotional": vulnerable, heartfelt, inspiring, sad, triumphant

CONFIDENCE scoring (0–100):
- 90–100: Guaranteed viral potential
- 70–89: Strong clip, clear standalone value
- 50–69: Good clip but needs strong thumbnail
- Below 50: Do not include — find something better

If the transcript does not have enough distinct strong moments for ${clipCount} clips, return as many high-quality clips as the content supports. Never pad with weak picks just to hit the number. Never return more than ${clipCount}.

You MUST return ONLY a valid JSON object. No markdown, no explanation, no preamble. The object must match this exact shape:

{
  "clips": [
    {
      "start_time": "mm:ss or hh:mm:ss",
      "end_time": "mm:ss or hh:mm:ss",
      "title": "max 60 chars — punchy, specific, no clickbait fluff",
      "hook": "max 90 chars — the exact line or moment that opens the clip",
      "why_it_works": "one concise sentence explaining the psychological or entertainment hook",
      "category": "intense" | "funny" | "emotional",
      "confidence": number between 0 and 100
    }
  ],
  "returnedCount": number
}

If the transcript has NO timestamps, estimate timestamps based on reading pace (~130 words per minute). Still return the same schema.`;
}

function hasTimestamps(transcript: string): boolean {
  return /\[\d{1,2}:\d{2}/.test(transcript);
}

export async function analyzeTranscript(
  transcript: string,
  clipCount: number
): Promise<{ clips: ClipResult[]; usedEstimatedTimestamps: boolean; returnedCount: number }> {
  const hasTs = hasTimestamps(transcript);

  const userMessage = hasTs
    ? `Here is the transcript with timestamps. Identify the ${clipCount} best clip moments:\n\n${transcript}`
    : `Here is the transcript WITHOUT timestamps. Estimate timestamps based on reading pace (~130 words per minute) and identify the ${clipCount} best clip moments. The timestamps you return will be estimates.\n\n${transcript}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: Math.max(2048, clipCount * 200),
    system: buildSystemPrompt(clipCount),
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: { clips: ClipResult[]; returnedCount?: number };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned invalid JSON — please try again");
  }

  if (!parsed.clips || !Array.isArray(parsed.clips) || parsed.clips.length === 0) {
    throw new Error("Model returned no clips — please try again");
  }

  // Hard cap — never exceed what was requested
  const clips = parsed.clips.slice(0, clipCount);
  const returnedCount = clips.length;

  if (!hasTs) {
    return {
      clips: clips.map((c) => ({ ...c, timestampsAreEstimates: true })),
      usedEstimatedTimestamps: true,
      returnedCount,
    };
  }

  return { clips, usedEstimatedTimestamps: false, returnedCount };
}
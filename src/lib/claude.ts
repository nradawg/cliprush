import Anthropic from "@anthropic-ai/sdk";
import type { ClipResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

const SYSTEM_PROMPT = `You are an expert short-form video strategist and viral content analyst. Your job is to identify exactly 6 clip moments from a transcript that would perform exceptionally well as standalone short clips (TikTok, YouTube Shorts, Instagram Reels).

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
- Below 50: Do not include

Return ONLY a valid JSON array of exactly 6 objects. No markdown, no explanation, no preamble.

Each object:
{
  "start_time": "mm:ss or hh:mm:ss",
  "end_time": "mm:ss or hh:mm:ss",
  "title": "max 60 chars",
  "hook": "max 90 chars — the opening line or moment",
  "why_it_works": "one sentence",
  "category": "intense" | "funny" | "emotional",
  "confidence": number 0-100
}

If no timestamps exist, estimate based on ~130 words/minute reading pace.`;

function hasTimestamps(transcript: string): boolean {
  return /\[\d{1,2}:\d{2}/.test(transcript);
}

export async function analyzeTranscript(
  transcript: string
): Promise<{ clips: ClipResult[]; usedEstimatedTimestamps: boolean }> {
  const hasTs = hasTimestamps(transcript);

  const userMessage = hasTs
    ? `Here is the transcript with timestamps. Identify the 6 best clip moments:\n\n${transcript}`
    : `Here is the transcript WITHOUT timestamps. Estimate timestamps based on reading pace and identify the 6 best clip moments.\n\n${transcript}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
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

  let clips: ClipResult[];
  try {
    clips = JSON.parse(cleaned) as ClipResult[];
  } catch {
    throw new Error("Model returned invalid JSON — please try again");
  }

  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error("Model returned no clips — please try again");
  }

  clips = clips.slice(0, 6);

  if (!hasTs) {
    clips = clips.map((c) => ({ ...c, timestampsAreEstimates: true }));
  }

  return { clips, usedEstimatedTimestamps: !hasTs };
}
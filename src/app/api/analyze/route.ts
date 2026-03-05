import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchYouTubeTranscript } from "@/lib/transcript";
import { analyzeTranscript } from "@/lib/claude";
import type { AnalyzeResponse } from "@/lib/types";

const MIN_CLIPS = 6;
const MAX_CLIPS = 50;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const ip = getIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { clips: [], error: `Rate limit hit. Please wait ${retryAfter}s before trying again.` },
      { status: 429 }
    );
  }

  let body: { mode: string; input: string; clipCount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ clips: [], error: "Invalid request body." }, { status: 400 });
  }

  const { mode, input } = body;

  const rawCount = Number(body.clipCount ?? MIN_CLIPS);
  if (!Number.isInteger(rawCount) || rawCount < MIN_CLIPS || rawCount > MAX_CLIPS) {
    return NextResponse.json(
      {
        clips: [],
        error: `clipCount must be an integer between ${MIN_CLIPS} and ${MAX_CLIPS}.`,
      },
      { status: 400 }
    );
  }
  const clipCount = rawCount;

  if (!input || typeof input !== "string" || input.trim().length < 10) {
    return NextResponse.json(
      { clips: [], error: "Input is too short. Paste a URL or transcript." },
      { status: 400 }
    );
  }

  let transcript = "";

  if (mode === "url") {
    try {
      transcript = await fetchYouTubeTranscript(input.trim());
    } catch (err) {
      const isAutoFetchFailed =
        err instanceof Error && err.message === "AUTO_FETCH_FAILED";

      console.error("Transcript fetch failed:", err);

      return NextResponse.json(
        {
          clips: [],
          transcriptFetchFailed: true,
          error: isAutoFetchFailed
            ? "Could not automatically fetch the transcript for this video. This can happen due to server-side restrictions when running on Vercel. Please copy the transcript manually and paste it using the Paste Transcript tab."
            : "Could not fetch the transcript. Please use the Paste Transcript tab instead.",
        },
        { status: 422 }
      );
    }
  } else {
    transcript = input.trim();
  }

  if (transcript.length < 50) {
    return NextResponse.json(
      { clips: [], error: "Transcript is too short. Need at least a few paragraphs." },
      { status: 400 }
    );
  }

  const wordCount = transcript.split(/\s+/).length;
  const minWordsNeeded = clipCount * 130;
  if (wordCount < minWordsNeeded * 0.4) {
    return NextResponse.json(
      {
        clips: [],
        error: `This transcript looks too short to produce ${clipCount} clips. Try reducing the clip count or pasting a longer transcript.`,
      },
      { status: 400 }
    );
  }

  const cappedTranscript = transcript.slice(0, 60000);

  try {
    const { clips, usedEstimatedTimestamps, returnedCount } = await analyzeTranscript(
      cappedTranscript,
      clipCount
    );

    return NextResponse.json(
      {
        clips,
        usedEstimatedTimestamps,
        requestedCount: clipCount,
        returnedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during analysis";
    console.error("Claude analysis error:", message);
    return NextResponse.json({ clips: [], error: message }, { status: 500 });
  }
}
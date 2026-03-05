import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchYouTubeTranscript } from "@/lib/transcript";
import { analyzeTranscript } from "@/lib/claude";
import type { AnalyzeResponse } from "@/lib/types";

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

  let body: { mode: string; input: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ clips: [], error: "Invalid request body." }, { status: 400 });
  }

  const { mode, input } = body;

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
      console.error("Transcript fetch failed:", err);
      return NextResponse.json(
        {
          clips: [],
          transcriptFetchFailed: true,
          error:
            "Couldn't fetch the transcript for that video. Captions may be disabled or the video is private. Please paste the transcript manually using the other tab.",
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

  const cappedTranscript = transcript.slice(0, 60000);

  try {
    const { clips, usedEstimatedTimestamps } = await analyzeTranscript(cappedTranscript);
    return NextResponse.json({ clips, usedEstimatedTimestamps }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during analysis";
    console.error("Claude analysis error:", message);
    return NextResponse.json({ clips: [], error: message }, { status: 500 });
  }
}
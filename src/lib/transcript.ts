import { YoutubeTranscript } from "youtube-transcript";

export function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Stage 1: HTML scrape ──────────────────────────────────────────────────────

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

interface TimedLine {
  start: number;
  text: string;
}

async function fetchCaptionTracksFromPage(videoId: string): Promise<CaptionTrack[]> {
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`YouTube page returned ${res.status}`);

  const html = await res.text();
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) throw new Error("No caption tracks found in page HTML");

  const raw = JSON.parse(match[1]) as Array<{
    baseUrl: string;
    languageCode: string;
    kind?: string;
  }>;

  return raw.map((t) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    kind: t.kind,
  }));
}

async function fetchTimedLines(baseUrl: string): Promise<TimedLine[]> {
  const res = await fetch(baseUrl + "&fmt=json3", {
    signal: AbortSignal.timeout(8000),
  });

  if (res.ok) {
    try {
      const json = (await res.json()) as {
        events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }>;
      };
      if (json.events) {
        return json.events
          .filter((e) => e.segs && e.tStartMs !== undefined)
          .map((e) => ({
            start: (e.tStartMs ?? 0) / 1000,
            text: (e.segs ?? [])
              .map((s) => s.utf8 ?? "")
              .join("")
              .replace(/\n/g, " ")
              .trim(),
          }))
          .filter((l) => l.text.length > 0);
      }
    } catch {
      // fall through to XML
    }
  }

  const xmlRes = await fetch(baseUrl, { signal: AbortSignal.timeout(8000) });
  if (!xmlRes.ok) throw new Error("Caption XML fetch failed");
  const xml = await xmlRes.text();

  const lines: TimedLine[] = [];
  const regex = /<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    const text = m[2]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (text) lines.push({ start: parseFloat(m[1]), text });
  }
  return lines;
}

async function fetchViaHtmlScrape(videoId: string): Promise<string> {
  const tracks = await fetchCaptionTracksFromPage(videoId);
  if (tracks.length === 0) throw new Error("No caption tracks found in page HTML");

  const preferred =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks[0];

  const lines = await fetchTimedLines(preferred.baseUrl);
  if (lines.length === 0) throw new Error("Caption file was empty");

  return lines.map((l) => `[${formatTimestamp(l.start)}] ${l.text}`).join("\n");
}

// ─── Stage 2: youtube-transcript package ──────────────────────────────────────

async function fetchViaPackage(videoId: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: "en",
  });

  if (!segments || segments.length === 0) {
    throw new Error("youtube-transcript returned no segments");
  }

  return segments
    .map((seg) => {
      const seconds = seg.offset / 1000;
      const cleaned = seg.text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      return `[${formatTimestamp(seconds)}] ${cleaned}`;
    })
    .join("\n");
}

// ─── Stage 3: Google YouTube Data API v3 ──────────────────────────────────────

async function fetchViaGoogleApi(videoId: string): Promise<string> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY env var not set");

  // Step 1: get caption track list
  const listRes = await fetch(
    `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    throw new Error(`Caption list failed: ${listRes.status} ${err}`);
  }

  const listJson = (await listRes.json()) as {
    items?: Array<{
      id: string;
      snippet: { language: string; trackKind: string };
    }>;
  };

  if (!listJson.items || listJson.items.length === 0) {
    throw new Error("No caption tracks found via Google API");
  }

  // Prefer English manual captions, then English ASR, then first available
  const track =
    listJson.items.find(
      (t) => t.snippet.language === "en" && t.snippet.trackKind === "standard"
    ) ||
    listJson.items.find(
      (t) => t.snippet.language === "en" && t.snippet.trackKind === "asr"
    ) ||
    listJson.items.find((t) => t.snippet.language === "en") ||
    listJson.items[0];

  // Step 2: download the caption file
  // Note: downloading caption content requires OAuth for most videos.
  // Instead we use the track's baseUrl via the timedtext API directly.
  const timedTextRes = await fetch(
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${track.snippet.language}&fmt=json3`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!timedTextRes.ok) throw new Error(`Timed text fetch failed: ${timedTextRes.status}`);

  const timedJson = (await timedTextRes.json()) as {
    events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }>;
  };

  if (!timedJson.events || timedJson.events.length === 0) {
    throw new Error("Timed text response was empty");
  }

  const lines = timedJson.events
    .filter((e) => e.segs && e.tStartMs !== undefined)
    .map((e) => ({
      start: (e.tStartMs ?? 0) / 1000,
      text: (e.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .replace(/\n/g, " ")
        .trim(),
    }))
    .filter((l) => l.text.length > 0);

  if (lines.length === 0) throw new Error("No lines parsed from timed text");

  return lines.map((l) => `[${formatTimestamp(l.start)}] ${l.text}`).join("\n");
}

// ─── Stage 4: Supadata proxy ───────────────────────────────────────────────────

async function fetchViaSupadata(videoId: string): Promise<string> {
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) throw new Error(`Supadata returned ${res.status}`);

  const json = (await res.json()) as {
    content?: Array<{ text: string; offset: number }>;
    transcript?: Array<{ text: string; start: number }>;
    error?: string;
  };

  if (json.error) throw new Error(`Supadata error: ${json.error}`);

  const segments = json.content ?? json.transcript;
  if (!segments || segments.length === 0) {
    throw new Error("Supadata returned empty transcript");
  }

  return segments
    .map((seg) => {
      const seconds =
        "offset" in seg
          ? (seg as { offset: number }).offset / 1000
          : (seg as { start: number }).start;
      const cleaned = seg.text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      return `[${formatTimestamp(seconds)}] ${cleaned}`;
    })
    .join("\n");
}

// ─── Stage 5: Kome proxy ───────────────────────────────────────────────────────

async function fetchViaKome(videoId: string): Promise<string> {
  const res = await fetch("https://kome.ai/api/transcript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ video_id: videoId }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Kome returned ${res.status}`);

  const json = (await res.json()) as {
    transcript?: Array<{ text: string; start: number; duration: number }>;
    error?: string;
  };

  if (json.error) throw new Error(`Kome error: ${json.error}`);
  if (!json.transcript || json.transcript.length === 0) {
    throw new Error("Kome returned empty transcript");
  }

  return json.transcript
    .map((seg) => {
      const cleaned = seg.text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      return `[${formatTimestamp(seg.start)}] ${cleaned}`;
    })
    .join("\n");
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not parse a valid video ID from that URL");

  const attempts: Array<{ name: string; fn: () => Promise<string> }> = [
    { name: "Stage 1 (HTML scrape)",       fn: () => fetchViaHtmlScrape(videoId)  },
    { name: "Stage 2 (youtube-transcript)", fn: () => fetchViaPackage(videoId)     },
    { name: "Stage 3 (Google API)",         fn: () => fetchViaGoogleApi(videoId)   },
    { name: "Stage 4 (Supadata proxy)",     fn: () => fetchViaSupadata(videoId)    },
    { name: "Stage 5 (Kome proxy)",         fn: () => fetchViaKome(videoId)        },
  ];

  for (const attempt of attempts) {
    try {
      const transcript = await attempt.fn();
      console.log(`[transcript] ${attempt.name} succeeded for ${videoId}`);
      return transcript;
    } catch (err) {
      console.warn(
        `[transcript] ${attempt.name} failed for ${videoId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw new Error("AUTO_FETCH_FAILED");
}
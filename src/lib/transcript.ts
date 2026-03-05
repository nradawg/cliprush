function extractVideoId(input: string): string | null {
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

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

async function fetchCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error("Failed to load YouTube page");

  const html = await res.text();
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) throw new Error("No caption tracks found");

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

interface TimedLine {
  start: number;
  text: string;
}

async function fetchTimedLines(baseUrl: string): Promise<TimedLine[]> {
  const res = await fetch(baseUrl + "&fmt=json3", {
    signal: AbortSignal.timeout(8000),
  });

  if (res.ok) {
    try {
      const json = await res.json() as {
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
  if (!xmlRes.ok) throw new Error("Caption fetch failed");
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

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not parse video ID from URL");

  const tracks = await fetchCaptionTracks(videoId);
  if (tracks.length === 0) throw new Error("No captions available for this video");

  const preferred =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks[0];

  const lines = await fetchTimedLines(preferred.baseUrl);
  if (lines.length === 0) throw new Error("Transcript is empty");

  return lines.map((l) => `[${formatTimestamp(l.start)}] ${l.text}`).join("\n");
}

export { extractVideoId };
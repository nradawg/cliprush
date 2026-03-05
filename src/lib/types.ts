export type ClipCategory = "intense" | "funny" | "emotional";

export interface ClipResult {
  start_time: string;
  end_time: string;
  title: string;
  hook: string;
  why_it_works: string;
  category: ClipCategory;
  confidence: number;
  timestampsAreEstimates?: boolean;
}

export interface AnalyzeRequest {
  mode: "url" | "transcript";
  input: string;
}

export interface AnalyzeResponse {
  clips: ClipResult[];
  transcriptFetchFailed?: boolean;
  usedEstimatedTimestamps?: boolean;
  error?: string;
}
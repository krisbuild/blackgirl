"use client";

import type { MarkStats } from "./marks-shared";
import { ensureUser, supabase } from "./supabase";

/** Shape returned by /api/analyze (see src/lib/youcam/skinAnalysis.ts). */
export type Analysis = {
  source: "live" | "cache";
  analyzedAt: string;
  concerns: Array<{ concern: string; rawScore: number; uiScore: number; maskUrl?: string; count?: number; coveragePct?: number }>;
  overall?: number;
  skinAge?: number;
  skinType?: Record<string, string>;
  marks?: { darkMarks?: MarkStats; acne?: MarkStats };
};

export type Scan = {
  id: string;
  created_at: string;
  photo_path: string | null;
  concerns: Analysis["concerns"];
  overall: number | null;
  skin_age: number | null;
  skin_type: Record<string, string> | null;
  note: string | null;
};

/** Small structured details kept in the scan's `note` column (max 500 chars). */
export type ScanNote = { markOnset?: string };

export function readNote(s: Pick<Scan, "note">): ScanNote {
  try {
    return s.note ? (JSON.parse(s.note) as ScanNote) : {};
  } catch {
    return {};
  }
}

export async function updateScanNote(id: string, note: ScanNote): Promise<void> {
  const { error } = await supabase().from("scans").update({ note: JSON.stringify(note) }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Date of the user's first scan, for "how long have we been tracking". */
export async function firstScanDate(): Promise<string | null> {
  await ensureUser();
  const { data } = await supabase().from("scans").select("created_at").order("created_at", { ascending: true }).limit(1);
  return data?.[0]?.created_at ?? null;
}

export const weeksSince = (iso: string | null | undefined) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000))) : 0;

const BUCKET = "scan-photos";

/** Save a scan: photo to the private bucket, scores to the scans table. */
export async function saveScan(photo: Blob, analysis: Analysis): Promise<Scan> {
  const uid = await ensureUser();
  const sb = supabase();
  const id = crypto.randomUUID();
  const path = `${uid}/${id}.jpg`;

  const up = await sb.storage.from(BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw new Error(`Couldn't save your photo: ${up.error.message}`);

  const { data, error } = await sb
    .from("scans")
    .insert({
      id,
      photo_path: path,
      // mask URLs expire after ~2 h, so only scores are stored
      concerns: analysis.concerns.map(({ concern, rawScore, uiScore, count, coveragePct }) => ({
        concern,
        rawScore,
        uiScore,
        ...(count != null ? { count, coveragePct } : {}),
      })),
      overall: analysis.overall ?? null,
      skin_age: analysis.skinAge ?? null,
      skin_type: analysis.skinType ?? null,
      analysis_source: analysis.source,
    })
    .select()
    .single();
  if (error) {
    await sb.storage.from(BUCKET).remove([path]);
    throw new Error(`Couldn't save your scan: ${error.message}`);
  }
  return data as Scan;
}

export async function listScans(): Promise<Scan[]> {
  await ensureUser();
  const { data, error } = await supabase()
    .from("scans")
    .select("id, created_at, photo_path, concerns, overall, skin_age, skin_type, note")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Scan[];
}

/** Short-lived signed URLs for private photos. */
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** Delete a scan and its photo. */
export async function deleteScan(scan: Pick<Scan, "id" | "photo_path">): Promise<void> {
  const sb = supabase();
  if (scan.photo_path) await sb.storage.from(BUCKET).remove([scan.photo_path]);
  const { error } = await sb.from("scans").delete().eq("id", scan.id);
  if (error) throw new Error(error.message);
}

export const scoreOf = (s: Pick<Scan, "concerns">, concern: string) =>
  s.concerns.find((c) => c.concern === concern)?.rawScore;

export const countOf = (s: Pick<Scan, "concerns">, concern: string) =>
  s.concerns.find((c) => c.concern === concern)?.count;

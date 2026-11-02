import "server-only";

/**
 * Minimal YouCam (Perfect Corp) V2 API client.
 *
 * Flow per the official docs (https://yce.perfectcorp.com/document/index.html):
 *   1. POST /s2s/v2.0/file/{feature}   -> file_id + pre-signed PUT url
 *   2. PUT the image bytes to that url (with the headers it returns)
 *   3. POST /s2s/v2.0/task/{feature}   -> task_id
 *   4. GET  /s2s/v2.0/task/{feature}/{task_id} until task_status is success | error
 *
 * Notes from the docs that shape this code:
 *   - Auth is `Authorization: Bearer <API key>`; no separate auth call in V2.
 *   - A task is dropped if it isn't polled for ~10 s, and units are still consumed,
 *     so we poll every 1-3 s and never stop polling early without a hard cap.
 *   - Units are only consumed when a task succeeds.
 *
 * The API key is read from process.env and never leaves the server.
 */

const BASE_URL = process.env.YOUCAM_BASE_URL ?? "https://yce-api-01.makeupar.com";

const POLL_MIN_MS = 1000;
const POLL_MAX_MS = 3000; // must stay well under the ~10 s task-drop window
const POLL_TIMEOUT_MS = 120_000;
const HTTP_TIMEOUT_MS = 30_000;

export type YouCamFeature =
  | "skin-analysis"
  | "skin-tone-analysis"
  | "fitzpatrick-scale-analyzer";

export class YouCamError extends Error {
  constructor(
    message: string,
    /** YouCam error code, e.g. error_no_face, InvalidParameters, or our own: timeout, no_api_key, http_error */
    public readonly code: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "YouCamError";
  }
}

function apiKey(): string {
  // Trim and strip quotes: pasted keys often pick up stray whitespace or quotes.
  const key = process.env.YOUCAM_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new YouCamError("YOUCAM_API_KEY is not set", "no_api_key");
  if (/\s/.test(key)) throw new YouCamError("YOUCAM_API_KEY contains spaces or line breaks", "bad_api_key");
  return key;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = HTTP_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new YouCamError(`Request to ${new URL(url).pathname} timed out`, "timeout");
    }
    // Surface the underlying cause (e.g. ENOTFOUND, ECONNRESET, UND_ERR_CONNECT_TIMEOUT) and which host failed.
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const why = cause?.code ?? cause?.message ?? (err as Error).message;
    console.error("[youcam] fetch failed", new URL(url).host, new URL(url).pathname, why);
    throw new YouCamError(`Network error reaching ${new URL(url).host}: ${why}`, `network_error:${new URL(url).host.split(".")[0]}:${why}`.slice(0, 80));
  } finally {
    clearTimeout(t);
  }
}

async function callJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const code = (body.error_code as string) ?? (res.status === 401 ? "unauthorized" : "http_error");
    const msg = (body.error as string) ?? (text.slice(0, 200) || res.statusText);
    throw new YouCamError(`YouCam ${path} failed (${res.status}): ${msg}`, code, res.status);
  }
  return body as T;
}

interface FileInitResponse {
  data: {
    files: Array<{
      file_id: string;
      requests: Array<{ method: string; url: string; headers: Record<string, string | number> }>;
    }>;
  };
}

/** Steps 1-2: register the file, then PUT the bytes to the pre-signed URL. Returns file_id. */
export async function uploadImage(
  feature: YouCamFeature,
  image: Uint8Array,
  contentType: "image/jpeg" | "image/png",
  fileName = contentType === "image/png" ? "selfie.png" : "selfie.jpg",
): Promise<string> {
  const init = await callJson<FileInitResponse>(`/s2s/v2.0/file/${feature}`, {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: fileName, file_size: image.byteLength }],
    }),
  });
  const file = init.data?.files?.[0];
  const req = file?.requests?.[0];
  if (!file?.file_id || !req?.url) {
    throw new YouCamError("File API returned no upload URL", "bad_response");
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers ?? {})) headers[k] = String(v);
  // fetch computes Content-Length itself and rejects it as a forbidden header in some runtimes.
  delete headers["Content-Length"];
  delete headers["content-length"];

  const put = await fetchWithTimeout(req.url, {
    method: req.method || "PUT",
    headers,
    body: Buffer.from(image),
  });
  if (!put.ok) {
    throw new YouCamError(`Upload to storage failed (${put.status})`, "upload_failed", put.status);
  }
  return file.file_id;
}

interface TaskCreateResponse {
  data: { task_id: string };
}

interface TaskStatusResponse {
  data: {
    task_status?: "running" | "success" | "error";
    status?: "running" | "success" | "error";
    polling_interval?: number;
    error?: string | null;
    error_message?: string;
    results?: unknown;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Steps 3-4: create the task and poll (bounded) until it finishes. Returns `data.results`. */
export async function runTask(
  feature: YouCamFeature,
  body: Record<string, unknown>,
  taskPath: string = feature,
): Promise<unknown> {
  const created = await callJson<TaskCreateResponse>(`/s2s/v2.0/task/${taskPath}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const taskId = created.data?.task_id;
  if (!taskId) throw new YouCamError("Task API returned no task_id", "bad_response");

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let wait = POLL_MIN_MS;
  while (Date.now() < deadline) {
    await sleep(wait);
    const status = await callJson<TaskStatusResponse>(
      `/s2s/v2.0/task/${taskPath}/${encodeURIComponent(taskId)}`,
    );
    const s = status.data?.task_status ?? status.data?.status;
    if (s === "success") return status.data.results;
    if (s === "error") {
      throw new YouCamError(
        status.data.error_message || status.data.error || "Task failed",
        status.data.error || "task_error",
      );
    }
    const hinted = status.data?.polling_interval;
    wait = Math.min(POLL_MAX_MS, Math.max(POLL_MIN_MS, hinted ?? wait * 1.5));
  }
  throw new YouCamError("Analysis did not finish within the time limit.", "timeout");
}

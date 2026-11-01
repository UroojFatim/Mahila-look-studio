import "server-only";

// Minimal YouCam API client (server side only — the API key never reaches the browser).
// Flow for every feature: upload file -> create task -> poll task.
// Docs: https://docs.perfectcorp.com/develop/quick_start_guide

const BASE = process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com";

export const FEATURES = {
  clothes: "cloth-v4",
  makeup: "makeup-vto",
  tone: "skin-tone-analysis",
  earring: "2d-vto/earring",
} as const;

export type FeatureKey = keyof typeof FEATURES;

export class YouCamError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new YouCamError("YouCam API key is not configured (set YOUCAM_API_KEY).", "NotConfigured", 503);
  return key;
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/s2s/v2.0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || (body && typeof body.status === "number" && body.status >= 400)) {
    throw new YouCamError(body?.error || `YouCam request failed (${res.status})`, body?.error_code, res.status);
  }
  return body;
}

/** Upload an image via the File API and return its file_id. */
export async function uploadImage(buf: Buffer, contentType: string, fileName: string): Promise<string> {
  const meta = await call("file", {
    method: "POST",
    body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: buf.length }] }),
  });
  const file = meta?.data?.files?.[0];
  const req = file?.requests?.[0];
  if (!file?.file_id || !req?.url) throw new YouCamError("Upload URL missing from File API response");

  const put = await fetch(req.url, {
    method: req.method || "PUT",
    headers: req.headers || { "Content-Type": contentType },
    body: new Uint8Array(buf),
  });
  if (!put.ok) throw new YouCamError(`Image upload failed (${put.status})`);
  return file.file_id as string;
}

export async function createTask(feature: FeatureKey, body: Record<string, unknown>): Promise<string> {
  const res = await call(`task/${FEATURES[feature]}`, { method: "POST", body: JSON.stringify(body) });
  const id = res?.data?.task_id;
  if (!id) throw new YouCamError("No task_id returned");
  return id;
}

export interface TaskResult {
  status: "running" | "success" | "error";
  url?: string;
  color?: Record<string, string>;
  error?: string;
}

/** Poll once. Normalises the slightly different result shapes per feature. */
export async function getTask(feature: FeatureKey, taskId: string): Promise<TaskResult> {
  const res = await call(`task/${FEATURES[feature]}/${encodeURIComponent(taskId)}`, { method: "GET" });
  const d = res?.data ?? {};
  const st = String(d.task_status || "running").toLowerCase();
  if (st === "error") return { status: "error", error: d.error_message || d.error || d.failure_reason || "AI task failed" };
  if (st !== "success") return { status: "running" };

  const r = d.results;
  const url =
    (Array.isArray(r) ? r[0]?.download_url || r[0]?.url : r?.url || r?.download_url) ||
    d.result_url ||
    undefined;
  return { status: "success", url, color: r?.color };
}

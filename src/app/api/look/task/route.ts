import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createTask, getTask, uploadImage, YouCamError, type FeatureKey } from "@/lib/lookstudio/youcam";
import { clientIp, isAllowedResultUrl, rateLimit } from "@/lib/lookstudio/guard";
import { getEarring, getOutfit } from "@/lib/lookstudio/catalog";
import { normalizeHex, planLook, toYouCamEffects, type Occasion } from "@/lib/lookstudio/harmony";

export const runtime = "nodejs";
export const maxDuration = 60;

const PUBLIC_DIR = path.join(process.cwd(), "public");
const STEPS: FeatureKey[] = ["clothes", "makeup", "tone", "earring"];
const OCCASIONS: Occasion[] = ["day", "evening", "wedding"];

// Catalogue images are uploaded once per server instance and reused for ~20 min.
const refCache = new Map<string, { id: string; at: number }>();
async function catalogFileId(publicPath: string): Promise<string> {
  const hit = refCache.get(publicPath);
  if (hit && Date.now() - hit.at < 20 * 60 * 1000) return hit.id;
  const rel = path.normalize(publicPath).replace(/^([/\\])+/, "");
  const full = path.join(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR)) throw new Error("Invalid catalogue path");
  const buf = await fs.readFile(full);
  const type = full.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const id = await uploadImage(buf, type, path.basename(full));
  refCache.set(publicPath, { id, at: Date.now() });
  return id;
}

function sourceFields(body: any): Record<string, string> {
  if (typeof body.srcFileId === "string" && body.srcFileId.length > 0 && body.srcFileId.length < 400) {
    return { src_file_id: body.srcFileId };
  }
  if (isAllowedResultUrl(body.srcUrl)) return { src_file_url: body.srcUrl };
  throw new YouCamError("Missing or invalid source image", "BadRequest", 400);
}

// POST: start one step of the look. Returns { taskId } (+ the makeup plan for the makeup step).
export async function POST(req: NextRequest) {
  if (!rateLimit(`task:${clientIp(req.headers)}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ message: "Demo limit reached — please try again in a while." }, { status: 429 });
  }
  try {
    const body = await req.json();
    const step = body?.step as FeatureKey;
    if (!STEPS.includes(step)) return NextResponse.json({ message: "Unknown step" }, { status: 400 });

    if (step === "tone") {
      const taskId = await createTask("tone", { ...sourceFields(body) });
      return NextResponse.json({ taskId });
    }

    if (step === "clothes") {
      const outfit = getOutfit(String(body.outfitId));
      if (!outfit) return NextResponse.json({ message: "Unknown outfit" }, { status: 400 });
      if (!outfit.vto) return NextResponse.json({ message: "This outfit uses product preview" }, { status: 400 });
      const refId = await catalogFileId(outfit.image);
      const taskId = await createTask("clothes", {
        ...sourceFields(body),
        ref_file_id: refId,
        garment_category: outfit.garmentCategory,
      });
      return NextResponse.json({ taskId });
    }

    if (step === "makeup") {
      const outfit = getOutfit(String(body.outfitId));
      if (!outfit) return NextResponse.json({ message: "Unknown outfit" }, { status: 400 });
      const occasion: Occasion = OCCASIONS.includes(body.occasion) ? body.occasion : "evening";
      const skinHex = normalizeHex(String(body.skinHex || ""));
      const plan = planLook(skinHex, outfit.hex, occasion);
      const taskId = await createTask("makeup", {
        ...sourceFields(body),
        effects: toYouCamEffects(plan),
        version: "1.0",
      });
      return NextResponse.json({ taskId, plan });
    }

    // earring
    const earring = getEarring(String(body.earringId));
    if (!earring) return NextResponse.json({ message: "Unknown earring" }, { status: 400 });
    const refId = await catalogFileId(earring.image);
    const taskId = await createTask("earring", { ...sourceFields(body), ref_file_ids: [refId] });
    return NextResponse.json({ taskId });
  } catch (err) {
    const status = err instanceof YouCamError && err.status ? err.status : 500;
    console.error("look/task POST:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Could not start step" }, { status });
  }
}

// GET ?step=&id= : poll a step. No units are used while polling.
export async function GET(req: NextRequest) {
  const step = req.nextUrl.searchParams.get("step") as FeatureKey;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!STEPS.includes(step) || !id || id.length > 400) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getTask(step, id));
  } catch (err) {
    const status = err instanceof YouCamError && err.status ? err.status : 500;
    return NextResponse.json({ message: err instanceof Error ? err.message : "Status check failed" }, { status });
  }
}

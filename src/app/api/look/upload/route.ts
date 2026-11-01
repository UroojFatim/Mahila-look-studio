import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadImage, YouCamError } from "@/lib/lookstudio/youcam";
import { clientIp, rateLimit } from "@/lib/lookstudio/guard";
import { headCrop, type CropKind } from "@/lib/lookstudio/crop";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const PRESET_DIR = path.join(process.cwd(), "public", "tryon-models");

// Accepts either an uploaded selfie (`photo`) or a preset model (`presetId`)
// and returns a YouCam file_id that later tasks use as their source image.
export async function POST(req: NextRequest) {
  if (!rateLimit(`upload:${clientIp(req.headers)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ message: "Too many uploads — please try again later." }, { status: 429 });
  }
  try {
    const form = await req.formData();
    const photo = form.get("photo");
    const presetId = String(form.get("presetId") || "");
    const cropRaw = String(form.get("crop") || "");
    const crop: CropKind | null = cropRaw === "face" || cropRaw === "bust" ? cropRaw : null;

    let buf: Buffer;
    let type: string;
    let name: string;

    if (photo && typeof photo !== "string") {
      type = photo.type;
      if (!/^image\/(jpeg|png)$/.test(type)) {
        return NextResponse.json({ message: "Please upload a JPG or PNG photo." }, { status: 400 });
      }
      if (photo.size > MAX_BYTES) {
        return NextResponse.json({ message: "Photo is too large (max 8 MB)." }, { status: 400 });
      }
      buf = Buffer.from(await photo.arrayBuffer());
      name = type === "image/png" ? "selfie.png" : "selfie.jpg";
    } else if (presetId) {
      const safe = path.basename(presetId);
      if (!/^model[0-9]+\.(jpe?g|png)$/i.test(safe)) {
        return NextResponse.json({ message: "Invalid model selection." }, { status: 400 });
      }
      buf = await fs.readFile(path.join(PRESET_DIR, safe));
      type = safe.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      name = safe;
    } else {
      return NextResponse.json({ message: "Upload a photo or choose a model." }, { status: 400 });
    }

    if (crop) {
      buf = await headCrop(buf, crop);
      type = "image/jpeg";
      name = `${crop}.jpg`;
    }
    const fileId = await uploadImage(buf, type, name);
    return NextResponse.json({ fileId });
  } catch (err) {
    const status = err instanceof YouCamError && err.status ? err.status : 500;
    console.error("look/upload:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Upload failed" }, { status });
  }
}

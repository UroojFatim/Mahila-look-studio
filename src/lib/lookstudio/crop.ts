import "server-only";
import sharp from "sharp";

// Head-region crops so face-based YouCam features get a large enough face:
//   "face" — tight face for Facial Color Tones (face must be > 60% of width)
//   "bust" — head, neck and shoulders for Makeup, Earrings and Necklace VTO
//            (necklace needs the neck to be >= 15% of the image width)
// Full-length photos (tall aspect) are cropped by framing ratios checked on the
// store's model photos; photos that are already close-ups are only lightly trimmed.

export type CropKind = "face" | "bust";

export async function headCrop(input: Buffer, kind: CropKind): Promise<Buffer> {
  const img = sharp(input).rotate(); // respect EXIF orientation
  const { width: W = 0, height: H = 0 } = await img.metadata();
  if (!W || !H) throw new Error("Could not read image");

  const fullLength = H / W >= 1.2;
  let cw: number;
  let ch: number;
  let top: number;

  if (fullLength) {
    cw = Math.round(W * (kind === "face" ? 0.18 : 0.36));
    ch = Math.round(cw * (kind === "face" ? 1.35 : 1.25));
    top = Math.round(H * 0.025);
  } else {
    cw = Math.round(W * (kind === "face" ? 0.7 : 1));
    ch = Math.min(H, Math.round(cw * (kind === "face" ? 1.25 : 1.3)));
    top = Math.round(kind === "face" ? H * 0.05 : 0);
  }
  ch = Math.min(ch, H - top);
  const left = Math.max(0, Math.round((W - cw) / 2));

  return img
    .extract({ left, top, width: Math.min(cw, W - left), height: ch })
    .resize({ width: kind === "face" ? 640 : 768, kernel: "lanczos3" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, Loader2, Sparkles, ShoppingBag, Upload, AlertCircle, RotateCcw } from "lucide-react";
import { OUTFITS, recommendEarring, type Earring, type Outfit } from "@/lib/lookstudio/catalog";
import type { LookPlan, Occasion } from "@/lib/lookstudio/harmony";

type StageKey = "upload" | "outfit" | "tone" | "makeup" | "earring";
type StageState = "idle" | "running" | "done" | "skipped" | "error";

const STAGE_LABEL: Record<StageKey, string> = {
  upload: "Preparing your photo",
  outfit: "Trying on the outfit · YouCam AI Clothes",
  tone: "Reading your skin tone · YouCam Facial Color Tones",
  makeup: "Matching makeup to outfit · YouCam Makeup VTO",
  earring: "Adding earrings · YouCam Earrings VTO",
};

const PRESETS = ["model1.jpg", "model2.jpg", "model3.jpg", "model4.jpg"];

// Fallback if the tone API can't read the photo (e.g. face too small).
const SKIN_SWATCHES = ["#F1D3BC", "#E3B795", "#C99A75", "#A87652", "#8A5A3B", "#5E3B26"];

const OCCASIONS: { key: Occasion; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "evening", label: "Evening" },
  { key: "wedding", label: "Wedding" },
];

const fmt = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

// --- helpers ---------------------------------------------------------------

async function resizeImage(file: Blob, maxSide = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

/** Rough head-and-shoulders crop so the face fills more of the frame for tone analysis. */
async function faceCrop(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const w = Math.round(bmp.width * 0.5);
  const h = Math.min(bmp.height, Math.round(w * 1.25));
  const x = Math.round((bmp.width - w) / 2);
  const y = Math.round(bmp.height * 0.04);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, x, y, w, h, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

async function uploadBlob(blob: Blob | null, presetId?: string): Promise<string> {
  const fd = new FormData();
  if (blob) fd.append("photo", blob, "photo.jpg");
  if (presetId) fd.append("presetId", presetId);
  const r = await fetch("/api/look/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Upload failed");
  return j.fileId;
}

async function startStep(payload: Record<string, unknown>) {
  const r = await fetch("/api/look/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Step failed");
  return j as { taskId: string; plan?: LookPlan };
}

async function waitFor(step: string, taskId: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2500));
    const r = await fetch(`/api/look/task?step=${step}&id=${encodeURIComponent(taskId)}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Status check failed");
    if (j.status === "success") return j as { url?: string; color?: Record<string, string> };
    if (j.status === "error") throw new Error(j.error || "AI step failed");
  }
  throw new Error("This is taking too long — please try again.");
}

// --- component ---------------------------------------------------------------

export default function LookStudio() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preset, setPreset] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [outfitId, setOutfitId] = useState<string>(OUTFITS[0].id);
  const [occasion, setOccasion] = useState<Occasion>("evening");
  const [withEarrings, setWithEarrings] = useState(true);

  const [stages, setStages] = useState<Record<StageKey, StageState>>({
    upload: "idle", outfit: "idle", tone: "idle", makeup: "idle", earring: "idle",
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [needsShade, setNeedsShade] = useState(false);

  // results kept so changing the occasion only re-runs makeup
  const [fileId, setFileId] = useState("");
  const [outfitUrl, setOutfitUrl] = useState("");
  const [skinHex, setSkinHex] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [plan, setPlan] = useState<LookPlan | null>(null);
  const [earring, setEarring] = useState<Earring | null>(null);

  const outfit = useMemo(() => OUTFITS.find((o) => o.id === outfitId)!, [outfitId]);
  const [saved, setSaved] = useState(false);

  const set = (k: StageKey, v: StageState) => setStages((s) => ({ ...s, [k]: v }));

  function resetResults() {
    setFileId(""); setOutfitUrl(""); setSkinHex(""); setFinalUrl(""); setPlan(null); setEarring(null);
    setError(""); setNeedsShade(false); setSaved(false);
    setStages({ upload: "idle", outfit: "idle", tone: "idle", makeup: "idle", earring: "idle" });
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = await resizeImage(f);
    setPhoto(small);
    setPreset("");
    setPreview(URL.createObjectURL(small));
    resetResults();
  }

  function onPreset(p: string) {
    setPreset(p);
    setPhoto(null);
    setPreview(`/tryon-models/${p}`);
    resetResults();
  }

  async function runMakeupAndJewelry(src: { srcFileId?: string; srcUrl?: string }, hex: string, occ: Occasion) {
    set("makeup", "running");
    const mk = await startStep({ step: "makeup", ...src, outfitId, skinHex: hex, occasion: occ });
    setPlan(mk.plan || null);
    const mkRes = await waitFor("makeup", mk.taskId);
    if (!mkRes.url) throw new Error("Makeup result missing");
    set("makeup", "done");
    let url = mkRes.url;

    if (withEarrings && mk.plan) {
      const pick = recommendEarring(mk.plan.skin.undertone);
      setEarring(pick);
      set("earring", "running");
      try {
        const er = await startStep({ step: "earring", srcUrl: url, earringId: pick.id });
        const erRes = await waitFor("earring", er.taskId);
        if (erRes.url) url = erRes.url;
        set("earring", "done");
      } catch {
        // Earrings are a bonus — keep the look if ears aren't visible.
        set("earring", "skipped");
      }
    } else {
      set("earring", "skipped");
    }
    setFinalUrl(url);
  }

  async function generate() {
    if (!photo && !preset) return;
    resetResults();
    setRunning(true);
    try {
      set("upload", "running");
      const id = await uploadBlob(photo, preset || undefined);
      const toneId = photo ? await uploadBlob(await faceCrop(photo)) : id;
      setFileId(id);
      set("upload", "done");

      // Outfit try-on and skin-tone analysis run in parallel.
      const outfitJob = (async () => {
        if (!outfit.vto) { set("outfit", "skipped"); return ""; }
        set("outfit", "running");
        const t = await startStep({ step: "clothes", srcFileId: id, outfitId });
        const r = await waitFor("clothes", t.taskId, 180_000);
        set("outfit", "done");
        return r.url || "";
      })();
      const toneJob = (async () => {
        set("tone", "running");
        try {
          const t = await startStep({ step: "tone", srcFileId: toneId });
          const r = await waitFor("tone", t.taskId);
          const hex = r.color?.skin_color;
          if (!hex) throw new Error("no tone");
          set("tone", "done");
          return hex;
        } catch {
          set("tone", "error");
          return "";
        }
      })();

      const [oUrl, hex] = await Promise.all([outfitJob, toneJob]);
      setOutfitUrl(oUrl);
      if (!hex) {
        setNeedsShade(true);
        setRunning(false);
        return;
      }
      setSkinHex(hex);
      await runMakeupAndJewelry(oUrl ? { srcUrl: oUrl } : { srcFileId: id }, hex, occasion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStages((s) => {
        const next = { ...s };
        (Object.keys(next) as StageKey[]).forEach((k) => { if (next[k] === "running") next[k] = "error"; });
        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  async function continueWithShade(hex: string) {
    setNeedsShade(false);
    setSkinHex(hex);
    set("tone", "done");
    setRunning(true);
    try {
      await runMakeupAndJewelry(outfitUrl ? { srcUrl: outfitUrl } : { srcFileId: fileId }, hex, occasion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  async function changeOccasion(occ: Occasion) {
    setOccasion(occ);
    if (!skinHex || running) return;
    setRunning(true);
    setError("");
    try {
      await runMakeupAndJewelry(outfitUrl ? { srcUrl: outfitUrl } : { srcFileId: fileId }, skinHex, occ);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  // Looks are saved on this device. (The bag is backed by the inventory DB;
  // wiring Look Studio items into it is the next step.)
  function shopTheLook() {
    try {
      const key = "mahila_saved_looks";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ outfitId, earringId: earring?.id, plan, image: finalUrl, at: Date.now() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
    } catch {
      /* storage unavailable — still show confirmation */
    }
    setSaved(true);
  }

  const hasSource = Boolean(photo || preset);
  const started = Object.values(stages).some((s) => s !== "idle");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <p className="font-script text-2xl text-primary">Mahila</p>
        <h1 className="font-serif text-3xl md:text-5xl">Look Studio</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Try the outfit, the makeup that suits it and your skin, and the earrings — together, before you buy.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- left: inputs ---------- */}
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-serif text-xl">1. Your photo</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
              >
                <Upload className="h-4 w-4" /> Upload photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPick} />
              <span className="text-sm text-muted-foreground">or pick a model</span>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPreset(p)}
                  className={`relative h-14 w-11 overflow-hidden rounded-md border-2 ${preset === p ? "border-primary" : "border-transparent"}`}
                  aria-label={`Use ${p}`}
                >
                  <Image src={`/tryon-models/${p}`} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Stand facing the camera, shoulders visible, face uncovered, good light, plain background.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl">2. Choose an outfit</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {OUTFITS.map((o) => (
                <OutfitCard key={o.id} outfit={o} active={o.id === outfitId} onClick={() => { setOutfitId(o.id); if (started) resetResults(); }} />
              ))}
            </div>
            {!outfit.vto && (
              <p className="mt-2 text-xs text-muted-foreground">
                Long eastern cuts are shown as a product preview — the makeup and earrings are still matched to this outfit.
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl">3. Occasion</h2>
            <div className="flex flex-wrap items-center gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  disabled={running}
                  onClick={() => changeOccasion(o.key)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${occasion === o.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  {o.label}
                </button>
              ))}
              <label className="ml-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={withEarrings} onChange={(e) => setWithEarrings(e.target.checked)} />
                Add matching earrings
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasSource || running}
            onClick={generate}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Creating your look…" : "Create my complete look"}
          </button>

          {started && (
            <ol className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
              {(Object.keys(STAGE_LABEL) as StageKey[]).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <StageIcon state={stages[k]} />
                  <span className={stages[k] === "skipped" ? "text-muted-foreground line-through" : ""}>{STAGE_LABEL[k]}</span>
                </li>
              ))}
            </ol>
          )}

          {needsShade && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm">We couldn&apos;t read your skin tone from this photo. Pick the closest shade:</p>
              <div className="flex gap-2">
                {SKIN_SWATCHES.map((h) => (
                  <button key={h} type="button" onClick={() => continueWithShade(h)} className="h-9 w-9 rounded-full border border-border" style={{ background: h }} aria-label={`Skin shade ${h}`} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        {/* ---------- right: result ---------- */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Frame label="Before" src={preview} />
            <Frame label="Your look" src={finalUrl || (!outfit.vto ? outfit.image : "")} loading={running} />
          </div>

          {plan && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-lg">Why this look works</h3>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  Skin <span className="inline-block h-4 w-4 rounded-full border" style={{ background: plan.skin.hex }} />
                  Outfit <span className="inline-block h-4 w-4 rounded-full border" style={{ background: outfit.hex }} />
                </span>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Swatch label="Lips" shade={plan.lip} />
                <Swatch label="Blush" shade={plan.blush} />
                <Swatch label="Lid" shade={plan.eyeshadow[0]} />
                <Swatch label="Crease" shade={plan.eyeshadow[1]} />
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.reasons.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          )}

          {finalUrl && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 font-serif text-lg">Shop the look</h3>
              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex justify-between"><span>{outfit.name}</span><span>{fmt(outfit.price)}</span></li>
                {earring && stages.earring === "done" && (
                  <li className="flex justify-between"><span>{earring.name}</span><span>{fmt(earring.price)}</span></li>
                )}
                {plan && <li className="flex justify-between text-muted-foreground"><span>Shade guide: {plan.lip.name} lips, {plan.blush.name} blush</span><span>—</span></li>}
              </ul>
              <div className="flex items-center justify-between">
                <span className="font-medium">{fmt(outfit.price + (earring && stages.earring === "done" ? earring.price : 0))}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={generate} disabled={running} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm">
                    <RotateCcw className="h-4 w-4" /> Redo
                  </button>
                  <button type="button" onClick={shopTheLook} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                    <ShoppingBag className="h-4 w-4" /> {saved ? "Look saved ✓" : "Save this look"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --- small pieces ---------------------------------------------------------

function OutfitCard({ outfit, active, onClick }: { outfit: Outfit; active: boolean; onClick: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <button type="button" onClick={onClick} className={`overflow-hidden rounded-lg border-2 text-left ${active ? "border-primary" : "border-border"}`}>
      <div className="relative aspect-[3/4] w-full" style={{ background: outfit.hex }}>
        {!broken && (
          <Image src={outfit.image} alt={outfit.name} fill sizes="160px" className="object-cover" onError={() => setBroken(true)} />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{outfit.style}</span>
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{outfit.name}</p>
        <p className="text-xs text-muted-foreground">{fmt(outfit.price)}</p>
      </div>
    </button>
  );
}

function Frame({ label, src, loading }: { label: string; src: string; loading?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-secondary">
      <div className="relative aspect-[3/4] w-full">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "—"}
          </div>
        )}
      </div>
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

function Swatch({ label, shade }: { label: string; shade: { hex: string; name: string } }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-1 h-10 w-10 rounded-full border border-border" style={{ background: shade.hex }} />
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{shade.name}</p>
    </div>
  );
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (state === "done") return <Check className="h-4 w-4 text-primary" />;
  if (state === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <span className="inline-block h-4 w-4 rounded-full border border-border" />;
}

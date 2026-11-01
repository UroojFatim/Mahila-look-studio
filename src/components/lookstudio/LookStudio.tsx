"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, Loader2, Sparkles, ShoppingBag, Upload, AlertCircle, RotateCcw, Download } from "lucide-react";
import {
  COLLECTIONS,
  EARRINGS,
  NECKLACES,
  OUTFITS,
  metalFor,
  recommendEarring,
  recommendNecklace,
  type Collection,
  type Jewel,
  type Outfit,
} from "@/lib/lookstudio/catalog";
import type { LookPlan, Occasion } from "@/lib/lookstudio/harmony";

type StageKey = "upload" | "outfit" | "tone" | "makeup" | "earring" | "necklace";
type StageState = "idle" | "running" | "done" | "skipped" | "error";

const STAGE_LABEL: Record<StageKey, string> = {
  upload: "Preparing your photo",
  outfit: "Trying on the outfit · YouCam AI Clothes",
  tone: "Reading your skin tone · YouCam Facial Color Tones",
  makeup: "Matching makeup to skin + outfit · YouCam Makeup VTO",
  earring: "Adding earrings · YouCam Earrings VTO",
  necklace: "Adding necklace · YouCam Necklace VTO",
};
const IDLE: Record<StageKey, StageState> = { upload: "idle", outfit: "idle", tone: "idle", makeup: "idle", earring: "idle", necklace: "idle" };

const PRESETS = ["model1.jpg", "model2.jpg", "model3.jpg", "model4.jpg"];
// Fallback if the tone API can't read the photo.
const SKIN_SWATCHES = ["#F1D3BC", "#E3B795", "#C99A75", "#A87652", "#8A5A3B", "#5E3B26"];
const OCCASIONS: { key: Occasion; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "evening", label: "Evening" },
  { key: "wedding", label: "Wedding" },
];

const fmt = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

// --- helpers ---------------------------------------------------------------

async function resizeImage(file: Blob, maxSide = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

async function upload(src: { photo: Blob | null; preset: string }, crop?: "face" | "bust"): Promise<string> {
  const fd = new FormData();
  if (src.photo) fd.append("photo", src.photo, "photo.jpg");
  else fd.append("presetId", src.preset);
  if (crop) fd.append("crop", crop);
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
  return j as { taskId: string; plan?: LookPlan; fileId?: string };
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
  const [collection, setCollection] = useState<Collection>("wedding");
  const [outfitId, setOutfitId] = useState<string>(OUTFITS[0].id);
  const [occasion, setOccasion] = useState<Occasion>("wedding");
  const [withEarrings, setWithEarrings] = useState(true);
  const [withNecklace, setWithNecklace] = useState(true);
  const [earringPick, setEarringPick] = useState<string>("auto");
  const [necklacePick, setNecklacePick] = useState<string>("auto");

  const [stages, setStages] = useState<Record<StageKey, StageState>>(IDLE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [needsShade, setNeedsShade] = useState(false);
  const [saved, setSaved] = useState(false);

  // results — kept so changing occasion or jewelry only re-runs what changed
  const [toneCache, setToneCache] = useState<Record<string, string>>({});
  const [skinHex, setSkinHex] = useState("");
  const [outfitUrl, setOutfitUrl] = useState("");
  const [bustId, setBustId] = useState("");
  const [closeUrl, setCloseUrl] = useState("");
  const [plan, setPlan] = useState<LookPlan | null>(null);
  const [earring, setEarring] = useState<Jewel | null>(null);
  const [necklace, setNecklace] = useState<Jewel | null>(null);

  const outfit = useMemo(() => OUTFITS.find((o) => o.id === outfitId)!, [outfitId]);
  const visible = OUTFITS.filter((o) => o.collection === collection);
  const sourceKey = photo ? `photo:${preview}` : `preset:${preset}`;
  const set = (k: StageKey, v: StageState) => setStages((s) => ({ ...s, [k]: v }));

  function resetResults() {
    setOutfitUrl(""); setBustId(""); setCloseUrl(""); setPlan(null); setEarring(null); setNecklace(null);
    setError(""); setNeedsShade(false); setSaved(false); setStages(IDLE);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = await resizeImage(f);
    setPhoto(small);
    setPreset("");
    setPreview(URL.createObjectURL(small));
    setSkinHex("");
    resetResults();
  }

  function onPreset(p: string) {
    setPreset(p);
    setPhoto(null);
    setPreview(`/tryon-models/${p}`);
    setSkinHex("");
    resetResults();
  }

  function chooseOutfit(o: Outfit) {
    setOutfitId(o.id);
    if (o.collection === "wedding") setOccasion("wedding");
    resetResults();
  }

  function failRunning(e: unknown) {
    setError(e instanceof Error ? e.message : "Something went wrong");
    setStages((s) => {
      const next = { ...s };
      (Object.keys(next) as StageKey[]).forEach((k) => { if (next[k] === "running") next[k] = "error"; });
      return next;
    });
  }

  /** Makeup on the close-up, then earrings, then necklace. */
  async function finishLook(bust: string, hex: string, occ: Occasion) {
    set("makeup", "running");
    const mk = await startStep({ step: "makeup", srcFileId: bust, outfitId, skinHex: hex, occasion: occ });
    const p = mk.plan!;
    setPlan(p);
    const mkRes = await waitFor("makeup", mk.taskId);
    if (!mkRes.url) throw new Error("Makeup result missing");
    set("makeup", "done");
    let url = mkRes.url;
    setCloseUrl(url);

    const formal = occ !== "day";
    if (withEarrings) {
      const e = earringPick === "auto" ? recommendEarring(p.skin.undertone, formal) : EARRINGS.find((x) => x.id === earringPick)!;
      setEarring(e);
      set("earring", "running");
      try {
        const t = await startStep({ step: "earring", srcUrl: url, earringId: e.id });
        const r = await waitFor("earring", t.taskId);
        if (r.url) { url = r.url; setCloseUrl(url); }
        set("earring", "done");
      } catch {
        set("earring", "skipped");
      }
    } else {
      set("earring", "skipped");
    }

    if (withNecklace) {
      const n = necklacePick === "auto" ? recommendNecklace(p.skin.undertone) : NECKLACES.find((x) => x.id === necklacePick)!;
      setNecklace(n);
      set("necklace", "running");
      try {
        const t = await startStep({ step: "necklace", srcUrl: url, necklaceId: n.id });
        const r = await waitFor("necklace", t.taskId);
        if (r.url) { url = r.url; setCloseUrl(url); }
        set("necklace", "done");
      } catch {
        set("necklace", "skipped");
      }
    } else {
      set("necklace", "skipped");
    }
  }

  async function generate() {
    if (!photo && !preset) return;
    resetResults();
    setRunning(true);
    const src = { photo, preset };
    try {
      set("upload", "running");
      const fullId = await upload(src);
      set("upload", "done");

      // Outfit try-on and skin tone run in parallel. Tone is cached per photo (20 units).
      const outfitJob = (async () => {
        if (!outfit.vto) { set("outfit", "skipped"); return ""; }
        set("outfit", "running");
        const t = await startStep({ step: "clothes", srcFileId: fullId, outfitId });
        const r = await waitFor("clothes", t.taskId, 180_000);
        set("outfit", "done");
        return r.url || "";
      })();
      const toneJob = (async () => {
        const cached = toneCache[sourceKey];
        if (cached) { set("tone", "done"); return cached; }
        set("tone", "running");
        try {
          const faceId = await upload(src, "face");
          const t = await startStep({ step: "tone", srcFileId: faceId });
          const r = await waitFor("tone", t.taskId);
          const hex = r.color?.skin_color;
          if (!hex) throw new Error("no tone");
          setToneCache((c) => ({ ...c, [sourceKey]: hex }));
          set("tone", "done");
          return hex;
        } catch {
          set("tone", "error");
          return "";
        }
      })();

      const [oUrl, hex] = await Promise.all([outfitJob, toneJob]);
      setOutfitUrl(oUrl);

      // Close-up of the result (or the original photo) for makeup + jewelry.
      const bust = oUrl ? (await startStep({ step: "portrait", srcUrl: oUrl })).fileId! : await upload(src, "bust");
      setBustId(bust);

      if (!hex) { setNeedsShade(true); return; }
      setSkinHex(hex);
      await finishLook(bust, hex, occasion);
    } catch (e) {
      failRunning(e);
    } finally {
      setRunning(false);
    }
  }

  async function rerun(hex: string, occ: Occasion) {
    if (!bustId) return;
    setRunning(true);
    setError(""); setSaved(false);
    setStages((s) => ({ ...s, makeup: "idle", earring: "idle", necklace: "idle" }));
    try {
      await finishLook(bustId, hex, occ);
    } catch (e) {
      failRunning(e);
    } finally {
      setRunning(false);
    }
  }

  function continueWithShade(hex: string) {
    setNeedsShade(false);
    setSkinHex(hex);
    setToneCache((c) => ({ ...c, [sourceKey]: hex }));
    set("tone", "done");
    rerun(hex, occasion);
  }

  function changeOccasion(occ: Occasion) {
    setOccasion(occ);
    if (skinHex && bustId && !running) rerun(skinHex, occ);
  }

  function shopTheLook() {
    try {
      const key = "mahila_saved_looks";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ outfitId, earringId: earring?.id, necklaceId: necklace?.id, occasion, plan, outfitUrl, closeUrl, at: Date.now() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
    } catch {
      /* storage unavailable — still confirm */
    }
    setSaved(true);
  }

  const hasSource = Boolean(photo || preset);
  const started = Object.values(stages).some((s) => s !== "idle");
  const earringOn = earring && stages.earring === "done";
  const necklaceOn = necklace && stages.necklace === "done";
  const total = outfit.price + (earringOn ? earring!.price : 0) + (necklaceOn ? necklace!.price : 0);
  const done = Boolean(closeUrl) && !running;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <header className="mb-10 text-center">
        <p className="font-script text-2xl text-primary">Mahila</p>
        <h1 className="font-serif text-3xl md:text-5xl">Look Studio</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Try the outfit, the makeup that suits your skin and that outfit, and the jewelry — together, before you buy.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ---------- inputs ---------- */}
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-serif text-xl">1. Your photo</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary">
                <Upload className="h-4 w-4" /> Upload photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPick} />
              <span className="text-sm text-muted-foreground">or pick a model</span>
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => onPreset(p)} aria-label={`Use ${p}`}
                  className={`relative h-14 w-11 overflow-hidden rounded-md border-2 ${preset === p ? "border-primary" : "border-transparent"}`}>
                  <Image src={`/tryon-models/${p}`} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Full-length photo, facing the camera, face uncovered, good light, plain background.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl">2. Choose an outfit</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {COLLECTIONS.map((c) => (
                <button key={c.key} type="button" onClick={() => setCollection(c.key)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${collection === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((o) => (
                <OutfitCard key={o.id} outfit={o} active={o.id === outfitId} onClick={() => chooseOutfit(o)} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {!outfit.vto
                ? "Long two-piece eastern cuts are shown as a product preview — makeup and jewelry are still matched to this outfit."
                : outfit.garmentCategory === "upper_body"
                  ? "Tops pair with your own bottoms. For a complete head-to-toe look, pick a dress or a Wedding piece."
                  : "Full-length piece — tried on head to toe."}
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl">3. Occasion &amp; jewelry</h2>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button key={o.key} type="button" disabled={running} onClick={() => changeOccasion(o.key)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${occasion === o.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <JewelRow label="Earrings" enabled={withEarrings} onToggle={setWithEarrings} items={EARRINGS} pick={earringPick} onPick={setEarringPick} />
            <JewelRow label="Necklace" enabled={withNecklace} onToggle={setWithNecklace} items={NECKLACES} pick={necklacePick} onPick={setNecklacePick} />
          </div>

          <button type="button" disabled={!hasSource || running} onClick={generate}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground disabled:opacity-50">
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

        {/* ---------- results ---------- */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Frame label="Before" src={preview} />
            <Frame label="The outfit" src={outfitUrl || (!outfit.vto && started ? outfit.image : "")} loading={running && !outfitUrl} />
            <Frame label="Makeup & jewelry" src={closeUrl} loading={running && !closeUrl} />
          </div>

          {plan && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-lg">Why this look works</h3>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  Skin <span className="inline-block h-4 w-4 rounded-full border" style={{ background: plan.skin.hex }} />
                  Outfit <span className="inline-block h-4 w-4 rounded-full border" style={{ background: outfit.hex }} />
                  <span className="capitalize">· {plan.skin.undertone} undertone</span>
                </span>
              </div>
              <div className="mb-4 grid grid-cols-4 gap-3">
                <Swatch label="Lips" shade={plan.lip} />
                <Swatch label="Blush" shade={plan.blush} />
                <Swatch label="Lid" shade={plan.eyeshadow[0]} />
                <Swatch label="Crease" shade={plan.eyeshadow[1]} />
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.reasons.map((r) => <li key={r}>• {r}</li>)}
                {(earringOn || necklaceOn) && (
                  <li>• {metalFor(plan.skin.undertone) === "gold" ? "Gold" : "Silver"} jewelry flatters a {plan.skin.undertone} undertone{occasion !== "day" ? ", and statement pieces carry a formal look" : ""}.</li>
                )}
              </ul>
            </div>
          )}

          {done && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 font-serif text-lg">Shop the look</h3>
              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex justify-between"><span>{outfit.name}</span><span>{fmt(outfit.price)}</span></li>
                {earringOn && <li className="flex justify-between"><span>{earring!.name}</span><span>{fmt(earring!.price)}</span></li>}
                {necklaceOn && <li className="flex justify-between"><span>{necklace!.name}</span><span>{fmt(necklace!.price)}</span></li>}
                {plan && <li className="text-muted-foreground">Shade guide: {plan.lip.name} lips · {plan.blush.name} blush · {plan.eyeshadow[1].name} crease</li>}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">Total {fmt(total)}</span>
                <div className="flex flex-wrap gap-2">
                  <a href={closeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm">
                    <Download className="h-4 w-4" /> Open close-up
                  </a>
                  <button type="button" onClick={generate} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm">
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
        {!broken && <Image src={outfit.image} alt={outfit.name} fill sizes="200px" className="object-cover" onError={() => setBroken(true)} />}
        <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{outfit.collection}</span>
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{outfit.name}</p>
        <p className="text-xs text-muted-foreground">{fmt(outfit.price)}</p>
      </div>
    </button>
  );
}

function JewelRow({ label, enabled, onToggle, items, pick, onPick }: {
  label: string; enabled: boolean; onToggle: (v: boolean) => void; items: Jewel[]; pick: string; onPick: (id: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <label className="flex w-28 items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /> {label}
      </label>
      {enabled && (
        <>
          <button type="button" onClick={() => onPick("auto")}
            className={`rounded-full border px-3 py-1 text-xs ${pick === "auto" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            Auto-match
          </button>
          {items.map((j) => (
            <button key={j.id} type="button" onClick={() => onPick(j.id)} title={`${j.name} · ${fmt(j.price)}`}
              className={`relative h-9 w-9 overflow-hidden rounded-full border-2 bg-white ${pick === j.id ? "border-primary" : "border-border"}`}>
              <Image src={j.image} alt={j.name} fill sizes="36px" className="object-contain p-0.5" />
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function Frame({ label, src, loading }: { label: string; src: string; loading?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-secondary">
      <div className="relative aspect-[3/4] w-full">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-cover object-top" />
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

// Mahila Look Studio — Color Harmony Engine
//
// Turns two inputs into a makeup look:
//   1. the shopper's skin colour (hex, from YouCam's Facial Color Tones Analyzer)
//   2. the outfit's dominant colour (hex, stored with each catalogue item)
// The output is a set of shades plus a plain-language reason for each, and a
// helper converts it into YouCam Makeup VTO `effects`.
//
// Pure functions only (no I/O) so it runs on server or client and is easy to test.

export type Undertone = "warm" | "cool" | "neutral";
export type Depth = "fair" | "light" | "medium" | "tan" | "deep";
export type Occasion = "day" | "evening" | "wedding";
export type ColorFamily =
  | "red"
  | "pink"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "brown"
  | "black"
  | "white"
  | "neutral";

export interface SkinProfile {
  hex: string;
  undertone: Undertone;
  depth: Depth;
}

export interface Shade {
  hex: string;
  name: string;
}

export interface LookPlan {
  skin: SkinProfile;
  outfitFamily: ColorFamily;
  occasion: Occasion;
  lip: Shade;
  blush: Shade;
  eyeshadow: [Shade, Shade];
  liner: Shade;
  reasons: string[];
  intensity: { lip: number; blush: number; eyeshadow: number; liner: number };
}

// ---------- colour maths ----------

export function normalizeHex(hex: string): string {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Invalid colour: ${hex}`);
  return `#${full.toUpperCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
}

export function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ---------- skin ----------

/**
 * Undertone from the Lab hue angle of the skin colour: yellower skin
 * (higher angle) reads warm, pinker skin (lower angle) reads cool.
 */
export function analyzeSkin(hex: string): SkinProfile {
  const norm = normalizeHex(hex);
  const [L, a, b] = rgbToLab(hexToRgb(norm));
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  const undertone: Undertone = hue >= 62 ? "warm" : hue <= 52 ? "cool" : "neutral";
  const depth: Depth = L >= 78 ? "fair" : L >= 68 ? "light" : L >= 56 ? "medium" : L >= 44 ? "tan" : "deep";
  return { hex: norm, undertone, depth };
}

// ---------- outfit ----------

export function classifyColor(hex: string): ColorFamily {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (l < 14) return "black";
  if (l > 85 && s < 50) return "white"; // white / ivory / cream
  if (s < 15) return "neutral";
  if (s < 45 && l > 60 && h >= 20 && h <= 60) return "neutral"; // beige / nude
  if (h >= 15 && h < 40 && l < 35 && s < 60) return "brown";
  if (h >= 345 || h < 12) return l > 70 ? "pink" : "red";
  if (h < 40) return "orange";
  if (h < 68) return "yellow";
  if (h < 160) return "green";
  if (h < 195) return "teal";
  if (h < 255) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

// ---------- shade library ----------
// Each family maps to shades that complement it, split by undertone.
// Values are hand-picked starting points, not brand SKUs.

type ByUndertone<T> = Record<Undertone, T>;

const LIPS: Record<ColorFamily, ByUndertone<Shade>> = {
  red: { warm: { hex: "#B5372B", name: "Brick red" }, cool: { hex: "#9E1B32", name: "Cherry red" }, neutral: { hex: "#A82A30", name: "Classic red" } },
  pink: { warm: { hex: "#C8645A", name: "Coral rose" }, cool: { hex: "#B5476B", name: "Berry pink" }, neutral: { hex: "#B9566A", name: "Rose" } },
  orange: { warm: { hex: "#B4513A", name: "Terracotta" }, cool: { hex: "#A9475A", name: "Muted raspberry" }, neutral: { hex: "#AF4F45", name: "Warm rose" } },
  yellow: { warm: { hex: "#A64B3C", name: "Rust nude" }, cool: { hex: "#9A4559", name: "Mauve berry" }, neutral: { hex: "#A04C4C", name: "Rosewood" } },
  green: { warm: { hex: "#8E3B32", name: "Deep brick" }, cool: { hex: "#8C2F4A", name: "Plum berry" }, neutral: { hex: "#8E3640", name: "Wine" } },
  teal: { warm: { hex: "#B0574A", name: "Peach brown" }, cool: { hex: "#A2465E", name: "Raspberry" }, neutral: { hex: "#A85258", name: "Dusty rose" } },
  blue: { warm: { hex: "#B4533F", name: "Burnt coral" }, cool: { hex: "#A0304F", name: "Fuchsia berry" }, neutral: { hex: "#A8424B", name: "Raspberry red" } },
  purple: { warm: { hex: "#9B4A45", name: "Spiced mauve" }, cool: { hex: "#8B3A5E", name: "Plum" }, neutral: { hex: "#94455A", name: "Mauve" } },
  brown: { warm: { hex: "#9C5040", name: "Cinnamon" }, cool: { hex: "#8F4A55", name: "Rosy brown" }, neutral: { hex: "#955049", name: "Caramel rose" } },
  black: { warm: { hex: "#A3302A", name: "Bold brick red" }, cool: { hex: "#8A1F3A", name: "Bold wine" }, neutral: { hex: "#962733", name: "Bold red" } },
  white: { warm: { hex: "#C06A5C", name: "Peachy nude" }, cool: { hex: "#B65E72", name: "Pink nude" }, neutral: { hex: "#BA6466", name: "Soft rose" } },
  neutral: { warm: { hex: "#B05E4E", name: "Warm nude" }, cool: { hex: "#A85A68", name: "Mauve nude" }, neutral: { hex: "#AC5C5B", name: "Rose nude" } },
};

const BLUSH: ByUndertone<Shade> = {
  warm: { hex: "#E08A6E", name: "Peach" },
  cool: { hex: "#D9788F", name: "Rose pink" },
  neutral: { hex: "#DB8079", name: "Soft coral" },
};

const LID_BASE: ByUndertone<Shade> = {
  warm: { hex: "#C9A27E", name: "Champagne gold" },
  cool: { hex: "#B9A0A6", name: "Taupe rose" },
  neutral: { hex: "#C2A08E", name: "Soft bronze" },
};

// Accent eyeshadow echoes or balances the outfit colour.
const LID_ACCENT: Record<ColorFamily, Shade> = {
  red: { hex: "#7A3B2E", name: "Copper brown" },
  pink: { hex: "#8E5A6E", name: "Mauve" },
  orange: { hex: "#8A4A2A", name: "Burnt copper" },
  yellow: { hex: "#8C6A2E", name: "Antique gold" },
  green: { hex: "#5E5A2E", name: "Olive gold" },
  teal: { hex: "#2F5C5E", name: "Deep teal" },
  blue: { hex: "#3A4766", name: "Smoky navy" },
  purple: { hex: "#5A3A62", name: "Plum smoke" },
  brown: { hex: "#5E4030", name: "Chocolate" },
  black: { hex: "#3A3333", name: "Charcoal smoke" },
  white: { hex: "#9C7E6A", name: "Soft taupe" },
  neutral: { hex: "#7E6050", name: "Warm taupe" },
};

const INTENSITY: Record<Occasion, LookPlan["intensity"]> = {
  day: { lip: 45, blush: 30, eyeshadow: 30, liner: 40 },
  evening: { lip: 65, blush: 40, eyeshadow: 50, liner: 60 },
  wedding: { lip: 80, blush: 50, eyeshadow: 70, liner: 75 },
};

const FAMILY_LABEL: Record<ColorFamily, string> = {
  red: "red", pink: "pink", orange: "orange/rust", yellow: "mustard/yellow", green: "green",
  teal: "teal", blue: "blue/navy", purple: "purple", brown: "brown", black: "black",
  white: "white/ivory", neutral: "neutral/beige",
};

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.max(0, Math.round(c * (1 - amount))));
  return normalizeHex([r, g, b].map((c) => c.toString(16).padStart(2, "0")).join(""));
}

export function planLook(skinHex: string, outfitHex: string, occasion: Occasion = "evening"): LookPlan {
  const skin = analyzeSkin(skinHex);
  const family = classifyColor(outfitHex);
  const ut = skin.undertone;

  let lip = LIPS[family][ut];
  // Deeper skin carries richer shades better.
  if (skin.depth === "tan" || skin.depth === "deep") lip = { hex: darken(lip.hex, 0.12), name: `Deep ${lip.name.toLowerCase()}` };

  const blush = BLUSH[ut];
  const eyeshadow: [Shade, Shade] = [LID_BASE[ut], LID_ACCENT[family]];
  const liner: Shade = family === "blue" || family === "teal"
    ? { hex: "#1F2A40", name: "Navy black" }
    : { hex: "#1A1414", name: "Soft black" };

  const reasons = [
    `Your skin reads ${ut}-toned with ${skin.depth} depth, so the base shades lean ${ut === "warm" ? "golden and peachy" : ut === "cool" ? "pink and rosy" : "balanced between peach and rose"}.`,
    `${lip.name} lips complement a ${FAMILY_LABEL[family]} outfit without competing with it.`,
    `${eyeshadow[1].name} on the crease ties the eyes back to the outfit colour; ${eyeshadow[0].name} keeps the lid bright.`,
    `${occasion === "wedding" ? "Wedding" : occasion === "evening" ? "Evening" : "Daytime"} intensity: ${occasion === "day" ? "sheer and soft" : occasion === "evening" ? "defined but wearable" : "full colour that holds up in photos"}.`,
  ];

  return { skin, outfitFamily: family, occasion, lip, blush, eyeshadow, liner, reasons, intensity: INTENSITY[occasion] };
}

/** YouCam Makeup VTO `effects` payload (version 1.0) for a plan. */
export function toYouCamEffects(plan: LookPlan) {
  const i = plan.intensity;
  return [
    { category: "skin_smooth", skinSmoothStrength: 35, skinSmoothColorIntensity: 30 },
    {
      category: "lip_color",
      shape: { name: "original" },
      style: { type: "full" },
      palettes: [{ color: plan.lip.hex, texture: "matte", colorIntensity: i.lip }],
    },
    {
      category: "blush",
      pattern: { name: "1color1" },
      palettes: [{ color: plan.blush.hex, texture: "matte", colorIntensity: i.blush }],
    },
    {
      category: "eye_shadow",
      pattern: { name: "2colors1" },
      palettes: [
        { color: plan.eyeshadow[0].hex, texture: "matte", colorIntensity: i.eyeshadow },
        { color: plan.eyeshadow[1].hex, texture: "matte", colorIntensity: i.eyeshadow },
      ],
    },
    {
      category: "eye_liner",
      pattern: { name: "Arabic3" },
      palettes: [{ color: plan.liner.hex, texture: "matte", colorIntensity: i.liner }],
    },
  ];
}

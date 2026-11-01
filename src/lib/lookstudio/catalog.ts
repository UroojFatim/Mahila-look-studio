// Look Studio catalogue.
// Images live in /public/look-studio/... (see public/look-studio/README.md).
// `hex` is the outfit's dominant colour — the Color Harmony Engine reads it.
// `vto: true` means YouCam Clothes VTO handles this garment well (western /
// fusion cuts). Long eastern kameez + shalwar is shown as a product preview
// instead, because generic VTO models don't render it faithfully.

export type GarmentCategory = "upper_body" | "full_body";

export interface Outfit {
  id: string;
  name: string;
  price: number;
  hex: string;
  image: string;
  style: "western" | "fusion" | "eastern";
  vto: boolean;
  garmentCategory: GarmentCategory;
}

export interface Earring {
  id: string;
  name: string;
  price: number;
  image: string;
  tone: "gold" | "silver" | "oxidised";
}

export const OUTFITS: Outfit[] = [
  { id: "maroon-wrap-top", name: "Maroon Wrap Top", price: 3490, hex: "#5A1020", image: "/look-studio/outfits/maroon-wrap-top.jpg", style: "western", vto: true, garmentCategory: "upper_body" },
  { id: "emerald-satin-shirt", name: "Emerald Satin Shirt", price: 3990, hex: "#1A5039", image: "/look-studio/outfits/emerald-satin-shirt.jpg", style: "western", vto: true, garmentCategory: "upper_body" },
  { id: "navy-midi-dress", name: "Navy Midi Dress", price: 5490, hex: "#1C2340", image: "/look-studio/outfits/navy-midi-dress.jpg", style: "western", vto: true, garmentCategory: "full_body" },
  { id: "blush-peplum-top", name: "Blush Peplum Top", price: 2990, hex: "#E7949D", image: "/look-studio/outfits/blush-peplum-top.jpg", style: "western", vto: true, garmentCategory: "upper_body" },
  { id: "mustard-short-kurti", name: "Mustard Short Kurti", price: 2790, hex: "#D48A1A", image: "/look-studio/outfits/mustard-short-kurti.jpg", style: "fusion", vto: true, garmentCategory: "upper_body" },
  { id: "teal-tunic", name: "Teal Fusion Tunic", price: 3290, hex: "#14565E", image: "/look-studio/outfits/teal-tunic.jpg", style: "fusion", vto: true, garmentCategory: "upper_body" },
  { id: "ivory-chikankari-kameez", name: "Ivory Chikankari Kameez", price: 6990, hex: "#EADBC6", image: "/look-studio/outfits/ivory-chikankari-kameez.jpg", style: "eastern", vto: false, garmentCategory: "full_body" },
  { id: "red-bridal-kameez", name: "Red Formal Kameez", price: 12990, hex: "#A00E1C", image: "/look-studio/outfits/red-formal-kameez.jpg", style: "eastern", vto: false, garmentCategory: "full_body" },
];

export const EARRINGS: Earring[] = [
  { id: "gold-jhumka", name: "Gold Jhumka", price: 1890, image: "/look-studio/earrings/gold-jhumka.png", tone: "gold" },
  { id: "silver-drops", name: "Silver Teardrop Earrings", price: 1290, image: "/look-studio/earrings/silver-drops.png", tone: "silver" },
];

export const getOutfit = (id: string) => OUTFITS.find((o) => o.id === id);
export const getEarring = (id: string) => EARRINGS.find((e) => e.id === id);

/** Silver suits cool undertones; gold suits warm and neutral. */
export function recommendEarring(undertone: "warm" | "cool" | "neutral"): Earring {
  const tone = undertone === "cool" ? "silver" : "gold";
  return EARRINGS.find((e) => e.tone === tone) ?? EARRINGS[0];
}

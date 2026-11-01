// Look Studio catalogue.
// Images live in /public/look-studio/... (see public/look-studio/README.md).
// `hex` is the outfit's dominant colour — the Color Harmony Engine reads it.
// `vto: true` means YouCam Clothes VTO is used. Tops keep the shopper's own
// bottoms (YouCam doesn't try on standalone trousers), so complete looks come
// from one-piece garments: dresses, gowns, maxis and anarkalis.
// Long two-piece eastern kameez is shown as a product preview instead.

export type GarmentCategory = "upper_body" | "full_body";
export type Collection = "western" | "fusion" | "wedding" | "eastern";
export type Metal = "gold" | "silver";

export interface Outfit {
  id: string;
  name: string;
  price: number;
  hex: string;
  image: string;
  collection: Collection;
  vto: boolean;
  garmentCategory: GarmentCategory;
}

export interface Jewel {
  id: string;
  name: string;
  price: number;
  image: string;
  metal: Metal;
  /** suits formal / wedding looks */
  statement?: boolean;
}

export const COLLECTIONS: { key: Collection; label: string }[] = [
  { key: "wedding", label: "Wedding" },
  { key: "western", label: "Western" },
  { key: "fusion", label: "Fusion" },
  { key: "eastern", label: "Eastern" },
];

export const OUTFITS: Outfit[] = [
  // Wedding — one-piece, full length
  { id: "maroon-velvet-gown", name: "Maroon Velvet Maxi Gown", price: 18990, hex: "#5C0F1E", image: "/look-studio/outfits/maroon-velvet-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "gold-anarkali", name: "Gold Embroidered Anarkali", price: 22490, hex: "#C39A4A", image: "/look-studio/outfits/gold-anarkali.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "mint-pishwas", name: "Mint Embellished Pishwas", price: 19990, hex: "#A8D5C2", image: "/look-studio/outfits/mint-pishwas.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "champagne-gown", name: "Champagne Sequin Gown", price: 24990, hex: "#E3CBA8", image: "/look-studio/outfits/champagne-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "royal-blue-maxi", name: "Royal Blue Silk Maxi", price: 16990, hex: "#1F3C8F", image: "/look-studio/outfits/royal-blue-maxi.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "blush-lehnga-gown", name: "Blush Pink Flared Gown", price: 21990, hex: "#E8A9B4", image: "/look-studio/outfits/blush-flared-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },

  // Western
  { id: "maroon-wrap-top", name: "Maroon Wrap Top", price: 3490, hex: "#5A1020", image: "/look-studio/outfits/maroon-wrap-top.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },
  { id: "emerald-satin-shirt", name: "Emerald Satin Shirt", price: 3990, hex: "#1A5039", image: "/look-studio/outfits/emerald-satin-shirt.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },
  { id: "navy-midi-dress", name: "Navy Midi Dress", price: 5490, hex: "#1C2340", image: "/look-studio/outfits/navy-midi-dress.jpg", collection: "western", vto: true, garmentCategory: "full_body" },
  { id: "blush-peplum-top", name: "Blush Peplum Top", price: 2990, hex: "#E7949D", image: "/look-studio/outfits/blush-peplum-top.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },

  // Fusion
  { id: "mustard-short-kurti", name: "Mustard Short Kurti", price: 2790, hex: "#D48A1A", image: "/look-studio/outfits/mustard-short-kurti.jpg", collection: "fusion", vto: true, garmentCategory: "upper_body" },
  { id: "teal-tunic", name: "Teal Fusion Tunic", price: 3290, hex: "#14565E", image: "/look-studio/outfits/teal-tunic.jpg", collection: "fusion", vto: true, garmentCategory: "upper_body" },

  // Eastern (product preview)
  { id: "ivory-chikankari-kameez", name: "Ivory Chikankari Kameez", price: 6990, hex: "#EADBC6", image: "/look-studio/outfits/ivory-chikankari-kameez.jpg", collection: "eastern", vto: false, garmentCategory: "full_body" },
  { id: "red-bridal-kameez", name: "Red Formal Kameez", price: 12990, hex: "#A00E1C", image: "/look-studio/outfits/red-formal-kameez.jpg", collection: "eastern", vto: false, garmentCategory: "full_body" },
];

export const EARRINGS: Jewel[] = [
  { id: "gold-jhumka", name: "Gold Jhumka", price: 1890, image: "/look-studio/earrings/gold-jhumka.png", metal: "gold", statement: true },
  { id: "silver-drops", name: "Silver Teardrop Earrings", price: 1290, image: "/look-studio/earrings/silver-drops.png", metal: "silver", statement: true },
  { id: "gold-studs", name: "Gold Pearl Studs", price: 990, image: "/look-studio/earrings/gold-pearl-studs.png", metal: "gold" },
  { id: "silver-hoops", name: "Silver Mini Hoops", price: 890, image: "/look-studio/earrings/silver-hoops.png", metal: "silver" },
];

export const NECKLACES: Jewel[] = [
  { id: "gold-kundan-necklace", name: "Gold Kundan Necklace", price: 4990, image: "/look-studio/necklaces/gold-kundan.png", metal: "gold", statement: true },
  { id: "silver-crystal-necklace", name: "Silver Crystal Necklace", price: 3990, image: "/look-studio/necklaces/silver-crystal.png", metal: "silver", statement: true },
];

export const getOutfit = (id: string) => OUTFITS.find((o) => o.id === id);
export const getEarring = (id: string) => EARRINGS.find((e) => e.id === id);
export const getNecklace = (id: string) => NECKLACES.find((n) => n.id === id);

/** Silver suits cool undertones; gold suits warm and neutral. */
export function metalFor(undertone: "warm" | "cool" | "neutral"): Metal {
  return undertone === "cool" ? "silver" : "gold";
}

/** Statement pieces for evening and wedding, small ones for day. */
export function recommendEarring(undertone: "warm" | "cool" | "neutral", formal = true): Jewel {
  const metal = metalFor(undertone);
  return (
    EARRINGS.find((e) => e.metal === metal && Boolean(e.statement) === formal) ??
    EARRINGS.find((e) => e.metal === metal) ??
    EARRINGS[0]
  );
}

export function recommendNecklace(undertone: "warm" | "cool" | "neutral"): Jewel {
  const metal = metalFor(undertone);
  return NECKLACES.find((n) => n.metal === metal) ?? NECKLACES[0];
}

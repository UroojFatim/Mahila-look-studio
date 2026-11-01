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
  { id: "maroon-velvet-gown", name: "Maroon Velvet Embroidered Gown", price: 18990, hex: "#6A1020", image: "/look-studio/outfits/maroon-velvet-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "gold-anarkali", name: "Antique Gold Anarkali Gown", price: 22490, hex: "#B0702E", image: "/look-studio/outfits/gold-anarkali.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "mint-pishwas", name: "Mint Embellished Pishwas", price: 19990, hex: "#95AC91", image: "/look-studio/outfits/mint-pishwas.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "champagne-gown", name: "Champagne Sequin Gown", price: 24990, hex: "#D1A073", image: "/look-studio/outfits/champagne-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "wine-velvet-maxi", name: "Wine Velvet Maxi", price: 14990, hex: "#6B0F1F", image: "/look-studio/outfits/wine-velvet-maxi.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "royal-blue-maxi", name: "Royal Blue Embroidered Gown", price: 16990, hex: "#1F2E9A", image: "/look-studio/outfits/royal-blue-maxi.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },
  { id: "blush-lehnga-gown", name: "Blush Pink Embellished Gown", price: 21990, hex: "#D98389", image: "/look-studio/outfits/blush-flared-gown.jpg", collection: "wedding", vto: true, garmentCategory: "full_body" },

  // Western
  { id: "maroon-wrap-top", name: "Maroon Wrap Top", price: 3490, hex: "#5A1020", image: "/look-studio/outfits/maroon-wrap-top.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },
  { id: "emerald-satin-shirt", name: "Emerald Satin Shirt", price: 3990, hex: "#1A5039", image: "/look-studio/outfits/emerald-satin-shirt.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },
  { id: "navy-midi-dress", name: "Navy Midi Dress", price: 5490, hex: "#1C2340", image: "/look-studio/outfits/navy-midi-dress.jpg", collection: "western", vto: true, garmentCategory: "full_body" },
  { id: "blush-peplum-top", name: "Blush Peplum Top", price: 2990, hex: "#E7949D", image: "/look-studio/outfits/blush-peplum-top.jpg", collection: "western", vto: true, garmentCategory: "upper_body" },

  { id: "black-jumpsuit", name: "Black Belted Jumpsuit", price: 6490, hex: "#1A1A1A", image: "/look-studio/outfits/black-jumpsuit.jpg", collection: "western", vto: true, garmentCategory: "full_body" },
  { id: "rust-wrap-maxi", name: "Rust Wrap Maxi Dress", price: 5990, hex: "#B4532A", image: "/look-studio/outfits/rust-wrap-maxi.jpg", collection: "western", vto: true, garmentCategory: "full_body" },
  { id: "sage-shirt-dress", name: "Sage Belted Shirt Dress", price: 4990, hex: "#8FA58A", image: "/look-studio/outfits/sage-shirt-dress.jpg", collection: "western", vto: true, garmentCategory: "full_body" },
  { id: "lilac-satin-gown", name: "Lilac Satin Evening Gown", price: 9990, hex: "#A784B4", image: "/look-studio/outfits/lilac-satin-gown.jpg", collection: "western", vto: true, garmentCategory: "full_body" },

  // Fusion
  { id: "mustard-short-kurti", name: "Mustard Short Kurti", price: 2790, hex: "#D48A1A", image: "/look-studio/outfits/mustard-short-kurti.jpg", collection: "fusion", vto: true, garmentCategory: "upper_body" },
  { id: "teal-tunic", name: "Teal Fusion Tunic", price: 3290, hex: "#14565E", image: "/look-studio/outfits/teal-tunic.jpg", collection: "fusion", vto: true, garmentCategory: "upper_body" },

  { id: "fuchsia-angrakha", name: "Fuchsia Mirror-work Angrakha", price: 7490, hex: "#C2306E", image: "/look-studio/outfits/fuchsia-angrakha.jpg", collection: "fusion", vto: true, garmentCategory: "full_body" },
  { id: "peach-anarkali-dress", name: "Peach Embroidered Anarkali Dress", price: 6990, hex: "#F2A285", image: "/look-studio/outfits/peach-anarkali-dress.jpg", collection: "fusion", vto: true, garmentCategory: "full_body" },
  { id: "olive-kaftan", name: "Olive Embroidered Kaftan", price: 5990, hex: "#5E6B3A", image: "/look-studio/outfits/olive-kaftan.jpg", collection: "fusion", vto: true, garmentCategory: "full_body" },
  { id: "navy-abaya-dress", name: "Navy Pearl-button Abaya Dress", price: 5490, hex: "#1E2A4A", image: "/look-studio/outfits/navy-abaya-dress.jpg", collection: "fusion", vto: true, garmentCategory: "full_body" },

  // Eastern — one-piece embroidered frocks (full try-on)
  { id: "emerald-embroidered-frock", name: "Emerald Embroidered Frock", price: 8990, hex: "#1E4A3A", image: "/look-studio/outfits/emerald-embroidered-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "maroon-tassel-frock", name: "Maroon Tassel Frock", price: 8990, hex: "#7A1426", image: "/look-studio/outfits/maroon-tassel-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "navy-embroidered-frock", name: "Navy Embroidered Frock", price: 8490, hex: "#1E2E55", image: "/look-studio/outfits/navy-embroidered-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "ivory-tassel-frock", name: "Ivory Tassel Frock", price: 8490, hex: "#EDE3D3", image: "/look-studio/outfits/ivory-tassel-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "lilac-wrap-frock", name: "Lilac Wrap Frock", price: 7990, hex: "#9C86B0", image: "/look-studio/outfits/lilac-wrap-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "sage-tassel-frock", name: "Sage Tassel Frock", price: 7990, hex: "#8C9479", image: "/look-studio/outfits/sage-tassel-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "coral-squareneck-frock", name: "Coral Square-neck Frock", price: 7990, hex: "#E58A80", image: "/look-studio/outfits/coral-squareneck-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },
  { id: "black-embroidered-frock", name: "Black Embroidered Frock", price: 8990, hex: "#1A1717", image: "/look-studio/outfits/black-embroidered-frock.jpg", collection: "eastern", vto: true, garmentCategory: "full_body" },

  // Eastern two-piece (product preview)
  { id: "ivory-chikankari-kameez", name: "Ivory Chikankari Kameez", price: 6990, hex: "#EADBC6", image: "/look-studio/outfits/ivory-chikankari-kameez.jpg", collection: "eastern", vto: false, garmentCategory: "full_body" },
  { id: "red-bridal-kameez", name: "Red Formal Kameez", price: 12990, hex: "#A00E1C", image: "/look-studio/outfits/red-formal-kameez.jpg", collection: "eastern", vto: false, garmentCategory: "full_body" },
];

export const EARRINGS: Jewel[] = [
  { id: "gold-jhumka", name: "Gold Jhumka", price: 1890, image: "/look-studio/earrings/gold-jhumka.png", metal: "gold", statement: true },
  { id: "silver-drops", name: "Silver Teardrop Earrings", price: 1290, image: "/look-studio/earrings/silver-drops.png", metal: "silver", statement: true },
  { id: "gold-studs", name: "Gold Pearl Studs", price: 990, image: "/look-studio/earrings/gold-pearl-studs.png", metal: "gold" },
  { id: "silver-hoops", name: "Silver Mini Hoops", price: 890, image: "/look-studio/earrings/silver-hoops.png", metal: "silver" },
  { id: "crystal-stud-gold", name: "Gold Solitaire Stud", price: 1190, image: "/look-studio/earrings/crystal-stud-gold.png", metal: "gold" },
  { id: "gold-floral-stud", name: "Gold Floral Crystal Stud", price: 1690, image: "/look-studio/earrings/gold-floral-stud.png", metal: "gold", statement: true },
  { id: "oxidised-jhumka", name: "Oxidised Silver Jhumka", price: 1490, image: "/look-studio/earrings/oxidised-jhumka.png", metal: "silver", statement: true },
];

export const NECKLACES: Jewel[] = [
  { id: "gold-kundan-necklace", name: "Gold Kundan Necklace", price: 4990, image: "/look-studio/necklaces/gold-kundan.png", metal: "gold", statement: true },
  { id: "emerald-kundan-pendant", name: "Emerald Kundan Pendant Set", price: 6490, image: "/look-studio/necklaces/emerald-kundan-pendant.png", metal: "gold", statement: true },
  { id: "ruby-kundan-necklace", name: "Ruby Kundan Necklace", price: 5990, image: "/look-studio/necklaces/ruby-kundan.png", metal: "gold", statement: true },
  { id: "pearl-choker", name: "Three-strand Pearl Choker", price: 3490, image: "/look-studio/necklaces/pearl-choker.png", metal: "gold", statement: true },
  { id: "gold-teardrop-pendant", name: "Gold Teardrop Necklace", price: 2490, image: "/look-studio/necklaces/gold-teardrop-pendant.png", metal: "gold" },
  { id: "silver-pendant", name: "Silver Teardrop Pendant", price: 1990, image: "/look-studio/necklaces/silver-pendant.png", metal: "silver" },
  { id: "pearl-strand", name: "Silver Pearl Strand", price: 2290, image: "/look-studio/necklaces/pearl-strand.png", metal: "silver" },
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

export function recommendNecklace(undertone: "warm" | "cool" | "neutral", formal = true): Jewel {
  const metal = metalFor(undertone);
  return (
    NECKLACES.find((n) => n.metal === metal && Boolean(n.statement) === formal) ??
    NECKLACES.find((n) => n.metal === metal) ??
    NECKLACES[0]
  );
}

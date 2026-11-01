import type { Metadata } from "next";
import LookStudio from "@/components/lookstudio/LookStudio";

export const metadata: Metadata = {
  title: "Look Studio",
  description:
    "Try on your complete look — outfit, makeup matched to your skin and the outfit, and earrings — together, before you buy. Powered by YouCam AI.",
  alternates: { canonical: "/look-studio" },
};

export default function LookStudioPage() {
  return <LookStudio />;
}

import type { MetadataRoute } from "next";
import { PAGE_LIGHT } from "@/lib/theme-color";

// Web app manifest: lets Legible be added to a phone's home screen and open in its
// own window. Icons are the Legible mark (public/icons/legible-mark.svg) on the
// Notebook page colour. No service worker: the installed app loads from the
// network like the website, so it never shows saved civic information as current.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Legible",
    short_name: "Legible",
    description: "The 9 Massachusetts ballot questions, sorted by which ones touch you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PAGE_LIGHT,
    theme_color: PAGE_LIGHT,
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

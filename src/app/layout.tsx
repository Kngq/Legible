import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces, Geist_Mono, Raleway, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ChatDockGate } from "@/components/ChatDockGate";
import { PAGE_DARK, PAGE_LIGHT } from "@/lib/theme-color";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Display face for the Legible wordmark.
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

// Editorial headlines: the featured decision, page titles, detail headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

// Reading face for official text in the measure reader.
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legible",
  description:
    "The 9 Massachusetts ballot questions, sorted by which ones touch you.",
  applicationName: "Legible",
  // Add to Home Screen on iPhone: open in its own window, named Legible. The
  // default status bar keeps the page below it, so no top inset is needed.
  appleWebApp: { capable: true, title: "Legible", statusBarStyle: "default" },
};

// viewport-fit=cover lets the page reach the screen edges on notched phones;
// globals.css and the bottom sheets keep content inside the safe area. Zoom
// stays allowed.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAGE_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: PAGE_DARK },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} ${raleway.variable} ${serif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ChatDockGate />
      </body>
    </html>
  );
}

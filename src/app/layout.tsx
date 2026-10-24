import type { Metadata } from "next";
import { Figtree, Geist_Mono, Raleway, Source_Serif_4 } from "next/font/google";
import { ChatDockGate } from "@/components/ChatDockGate";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Display face for the Legible wordmark.
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${raleway.variable} ${serif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ChatDockGate />
      </body>
    </html>
  );
}

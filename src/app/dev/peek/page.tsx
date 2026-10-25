import { notFound } from "next/navigation";
import { PeekLab } from "@/components/plant/PeekLab";

// Development-only comparison of peek-out treatments for the For you plant. Not part of the production app.
export default function PeekPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PeekLab />;
}

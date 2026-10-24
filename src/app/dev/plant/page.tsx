import { notFound } from "next/navigation";
import { PlantLab } from "@/components/plant/PlantLab";

// Development-only preview of the plant companion. Not part of the production app.
export default function PlantPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PlantLab />;
}

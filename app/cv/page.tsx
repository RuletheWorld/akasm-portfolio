import type { Metadata } from "next";
import Home from "@/components/home/Home";

export const metadata: Metadata = { title: "CV", alternates: { canonical: "/cv" } };

/** The CV without the boarding gate — link this one in applications. */
export default function CvPage() {
  return <Home />;
}

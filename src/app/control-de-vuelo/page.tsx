import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Control de vuelo | Skybound Survival",
  robots: { index: false, follow: false, noarchive: true },
};

export default function FlightControl() {
  return <AnalyticsDashboard />;
}

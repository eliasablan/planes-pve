import type { SVGProps } from "react";
import { Rocket, Wrench } from "lucide-react";
import type { PickupKind } from "@/store/useGameStore";

/** One silhouette per supply, shared by the world, guide, radar and receipts. */
export function PickupIcon({ kind, className, ...props }: SVGProps<SVGSVGElement> & { kind: PickupKind }) {
  if (kind === "missile") return <Rocket {...props} aria-hidden="true" className={className} strokeWidth={2} />;
  if (kind === "repair") return <Wrench {...props} aria-hidden="true" className={className} strokeWidth={2.2} />;
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className}>
      {/* Paired cartridges, rather than a generic box or seashell icon. */}
      <path d="M4 9V6l3-4 3 4v3m-6 0h6v12H4V9Zm0 8h6M14 11V8l3-4 3 4v3m-6 0h6v10h-6V11Zm0 6h6" />
    </svg>
  );
}

import { useEffect, useState } from "react";
import type { BarWithMatches } from "@/lib/types";

export function MapView({
  bars,
  selectedBarId,
  onSelect,
}: {
  bars: BarWithMatches[];
  selectedBarId: string | null;
  onSelect: (id: string) => void;
}) {
  const [mod, setMod] = useState<null | typeof import("./MapViewClient")>(null);

  useEffect(() => {
    import("./MapViewClient").then((m) => setMod(() => m));
  }, []);

  if (!mod) {
    return (
      <div className="w-full h-full bg-stadium-soft rounded-2xl border border-border flex items-center justify-center">
        <span className="text-muted-foreground font-display text-2xl tracking-widest opacity-30">Cargando mapa…</span>
      </div>
    );
  }
  const C = mod.MapViewClient;
  return <C bars={bars} selectedBarId={selectedBarId} onSelect={onSelect} />;
}
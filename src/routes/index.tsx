import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MapView } from "@/components/MapView";
import { flag } from "@/components/TeamBadge";
import { FEATURE_OPTIONS, ZONAS, NEIGHBORHOODS_BY_ZONA, type Bar, type BarWithMatches, type Match, type Zona } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapPin, Tv, Beer, Pizza, Coffee, UtensilsCrossed, Filter } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MundialBar — ¿Dónde mirás el partido?" },
      { name: "description", content: "Encontrá bares en Buenos Aires que pasan los partidos del Mundial. Filtrá por partido, barrio y servicios." },
      { property: "og:title", content: "MundialBar — ¿Dónde mirás el partido?" },
      { property: "og:description", content: "Bares con TV en CABA, Zona Norte y Zona Sur con los partidos del Mundial." },
    ],
  }),
  component: DiscoveryPage,
});

const featureIcon = (id: string) => {
  switch (id) {
    case "pizzeria": return Pizza;
    case "alcohol": return Beer;
    case "merienda":
    case "cafe": return Coffee;
    case "comidas": return UtensilsCrossed;
    default: return Tv;
  }
};

function DiscoveryPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedZonas, setSelectedZonas] = useState<Set<Zona>>(new Set());
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("matches").select("*").gte("kickoff_at", now).order("kickoff_at");
      if (error) throw error;
      return data as Match[];
    },
  });

  const { data: bars = [] } = useQuery({
    queryKey: ["approved-bars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bars")
        .select("*, bar_matches(match_id)")
        .eq("status", "approved");
      if (error) throw error;
      return (data as (Bar & { bar_matches: { match_id: string }[] })[]).map((b) => ({
        ...b,
        matchIds: b.bar_matches.map((m) => m.match_id),
      })) as BarWithMatches[];
    },
  });

  const matchesByDay = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach((m) => {
      const key = new Date(m.kickoff_at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).sort();
  }, [matches]);

  const filteredBars = useMemo(() => {
    return bars.filter((b) => {
      if (selectedMatchId && !b.matchIds.includes(selectedMatchId)) return false;
      if (selectedZonas.size && !selectedZonas.has(b.zona)) return false;
      if (selectedNeighborhoods.size && !selectedNeighborhoods.has(b.neighborhood)) return false;
      if (selectedFeatures.size) {
        for (const f of selectedFeatures) if (!b.features.includes(f)) return false;
      }
      return true;
    });
  }, [bars, selectedMatchId, selectedZonas, selectedNeighborhoods, selectedFeatures]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    setter(n);
  };

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const availableNeighborhoods = selectedZonas.size
    ? Array.from(selectedZonas).flatMap((z) => NEIGHBORHOODS_BY_ZONA[z])
    : ZONAS.flatMap((z) => NEIGHBORHOODS_BY_ZONA[z]);

  return (
    <div className="min-h-screen bg-stadium text-foreground">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-2">
            ¿Dónde mirás el partido?
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Bares en CABA, Zona Norte y Zona Sur que transmiten el Mundial. Filtrá por partido y barrio.
          </p>
        </header>

        {/* Match rail */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tv className="size-4 text-albice" />
            <h2 className="font-display text-sm tracking-widest uppercase text-muted-foreground">Próximos partidos</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setSelectedMatchId(null)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
                !selectedMatchId
                  ? "bg-albice text-stadium border-albice"
                  : "bg-stadium-soft text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Todos los partidos
            </button>
            {matches.map((m) => {
              const date = new Date(m.kickoff_at);
              const active = selectedMatchId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatchId(active ? null : m.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
                    active
                      ? "bg-albice text-stadium border-albice"
                      : "bg-stadium-soft border-border hover:border-albice/50"
                  )}
                >
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono">
                      {date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })} · {date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      <span>{flag(m.home_code)}</span><span>{m.home_code}</span>
                      <span className={cn("text-xs", active ? "opacity-60" : "text-muted-foreground")}>vs</span>
                      <span>{m.away_code}</span><span>{flag(m.away_code)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 rounded-2xl border border-border bg-card/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-albice" />
              <h3 className="font-display text-sm tracking-widest uppercase text-muted-foreground">Filtros</h3>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setShowFilters((s) => !s)}>
              {showFilters ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className={cn("space-y-4", !showFilters && "hidden lg:block")}>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Zona</p>
              <div className="flex flex-wrap gap-2">
                {ZONAS.map((z) => (
                  <button
                    key={z}
                    onClick={() => { toggle(selectedZonas, z, setSelectedZonas); setSelectedNeighborhoods(new Set()); }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                      selectedZonas.has(z)
                        ? "bg-pitch text-foreground border-pitch"
                        : "bg-stadium-soft border-border hover:border-pitch/60 text-muted-foreground"
                    )}
                  >{z}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Barrio</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                {availableNeighborhoods.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggle(selectedNeighborhoods, n, setSelectedNeighborhoods)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs transition-colors border",
                      selectedNeighborhoods.has(n)
                        ? "bg-albice text-stadium border-albice font-semibold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Servicios</p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_OPTIONS.map((f) => {
                  const Icon = featureIcon(f.id);
                  const active = selectedFeatures.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(selectedFeatures, f.id, setSelectedFeatures)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        active ? "bg-pitch/20 border-pitch text-pitch" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-3.5" /> {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3 lg:max-h-[680px] lg:overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              {filteredBars.length} {filteredBars.length === 1 ? "bar" : "bares"}
            </p>
            {filteredBars.length === 0 && (
              <div className="p-8 rounded-2xl border border-dashed border-border text-center">
                <p className="text-muted-foreground text-sm">No hay bares con esos filtros. Probá quitar alguno.</p>
              </div>
            )}
            {filteredBars.map((b) => {
              const active = selectedBarId === b.id;
              const shownMatches = (selectedMatchId ? [selectedMatchId] : b.matchIds)
                .map((id) => matchById.get(id)).filter(Boolean) as Match[];
              const nextMatch = shownMatches
                .filter((m) => new Date(m.kickoff_at).getTime() >= Date.now() - 3 * 3600_000)
                .sort((a, b2) => +new Date(a.kickoff_at) - +new Date(b2.kickoff_at))[0] ?? shownMatches[0];
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarId(b.id)}
                  className={cn(
                    "w-full text-left bg-card border p-4 rounded-xl transition-all",
                    active ? "border-albice ring-2 ring-albice/20" : "border-border hover:border-albice/50"
                  )}
                >
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="min-w-0">
                      <h3 className={cn("text-lg font-bold leading-tight", active && "text-albice")}>{b.name}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3" /> {b.neighborhood} · {b.zona}
                      </p>
                    </div>
                    {b.matchIds.length > 0 && (
                      <span className="bg-pitch/15 text-pitch text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0">
                        {b.matchIds.length} {b.matchIds.length === 1 ? "partido" : "partidos"}
                      </span>
                    )}
                  </div>
                  {b.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {b.features.slice(0, 4).map((f) => {
                        const opt = FEATURE_OPTIONS.find((o) => o.id === f);
                        if (!opt) return null;
                        const Icon = featureIcon(f);
                        return (
                          <span key={f} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-stadium px-2 py-0.5 rounded">
                            <Icon className="size-3" /> {opt.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {nextMatch ? (
                    <div className="flex items-center gap-3 bg-stadium/60 p-3 rounded-lg border border-border">
                      <div className="text-center min-w-12">
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">
                          {new Date(nextMatch.kickoff_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {new Date(nextMatch.kickoff_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-2 text-sm font-bold">
                        <span>{flag(nextMatch.home_code)}</span><span>{nextMatch.home_code}</span>
                        <span className="text-muted-foreground font-display text-base">VS</span>
                        <span>{nextMatch.away_code}</span><span>{flag(nextMatch.away_code)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin partidos cargados todavía.</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 h-[400px] lg:h-[680px]">
            <MapView bars={filteredBars} selectedBarId={selectedBarId} onSelect={setSelectedBarId} />
          </div>
        </div>

        {/* Days of matches as a quick reference */}
        {matchesByDay.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="font-display text-3xl mb-6">Calendario del Mundial</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchesByDay.map(([day, ms]) => (
                <div key={day} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-albice uppercase tracking-widest mb-3">
                    {new Date(day + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <ul className="space-y-2">
                    {ms.map((m) => (
                      <li key={m.id} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(m.kickoff_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-2">
                          <span>{flag(m.home_code)}</span><span className="font-semibold">{m.home_code}</span>
                          <span className="text-muted-foreground text-xs">vs</span>
                          <span className="font-semibold">{m.away_code}</span><span>{flag(m.away_code)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border mt-20 py-12 px-6 text-center">
        <p className="text-muted-foreground text-sm italic">Hecho con amor en Buenos Aires para el Mundial.</p>
      </footer>
    </div>
  );
}

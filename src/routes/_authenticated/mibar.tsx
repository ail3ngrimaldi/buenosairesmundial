import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { flag } from "@/components/TeamBadge";
import type { Bar, Match } from "@/lib/types";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mibar")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const { data: bar, isLoading } = useQuery({
    queryKey: ["my-bar", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bars").select("*").eq("owner_id", user.id).maybeSingle();
      if (error) throw error;
      return data as Bar | null;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("matches").select("*").gte("kickoff_at", now).order("kickoff_at");
      if (error) throw error;
      return data as Match[];
    },
  });

  const { data: broadcasts = [] } = useQuery({
    enabled: !!bar,
    queryKey: ["broadcasts", bar?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bar_matches").select("match_id").eq("bar_id", bar!.id);
      if (error) throw error;
      return data.map((d) => d.match_id) as string[];
    },
  });

  const broadcastSet = useMemo(() => new Set(broadcasts), [broadcasts]);

  const matchesByDay = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach((m) => {
      const key = new Date(m.kickoff_at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).sort();
  }, [matches]);

  const toggleMatch = async (matchId: string) => {
    if (!bar) return;
    setSavingMatchId(matchId);
    const has = broadcastSet.has(matchId);
    if (has) {
      const { error } = await supabase.from("bar_matches").delete().eq("bar_id", bar.id).eq("match_id", matchId);
      if (error) toast.error("No se pudo guardar"); else toast.success("Quitado");
    } else {
      const { error } = await supabase.from("bar_matches").insert({ bar_id: bar.id, match_id: matchId });
      if (error) toast.error("No se pudo guardar"); else toast.success("¡Sumado al partido!");
    }
    qc.invalidateQueries({ queryKey: ["broadcasts", bar.id] });
    setSavingMatchId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stadium">
        <SiteHeader />
        <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="min-h-screen bg-stadium">
        <SiteHeader />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-5xl mb-4">¡Bienvenido!</h1>
          <p className="text-muted-foreground mb-8">
            Todavía no tenés un bar registrado. Cargá los datos y un admin lo va a revisar antes de publicarlo en el mapa.
          </p>
          <Button asChild className="bg-albice text-stadium hover:bg-albice/90 font-semibold">
            <Link to="/onboarding">Registrar mi bar</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stadium">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Panel de control</p>
            <h1 className="font-display text-4xl md:text-5xl">{bar.name}</h1>
            <p className="text-muted-foreground text-sm">{bar.neighborhood} · {bar.zona}</p>
          </div>
          <StatusPill status={bar.status} />
        </div>

        {bar.status === "pending" && (
          <div className="my-6 p-4 rounded-xl bg-albice/10 border border-albice/30 flex items-start gap-3">
            <AlertCircle className="size-5 text-albice mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Estamos revisando tu solicitud.</p>
              <p className="text-muted-foreground">
                Esto puede tardar unos minutos. Apenas la aprobemos, te vamos a notificar por
                alguno de los canales que informaste (teléfono o Instagram). Mientras tanto,
                podés ir cargando los partidos que vas a transmitir.
              </p>
            </div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-2xl mb-2">Partidos que vas a transmitir</h2>
          <p className="text-sm text-muted-foreground mb-6">Activá el switch en cada partido que vas a pasar en tu bar.</p>

          <div className="space-y-8">
            {matchesByDay.map(([day, ms]) => (
              <div key={day}>
                <p className="text-xs font-bold text-albice mb-3 uppercase tracking-widest">
                  {new Date(day + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="space-y-2">
                  {ms.map((m) => {
                    const on = broadcastSet.has(m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-card border border-border p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground text-xs font-mono flex items-center gap-1.5 w-16">
                            <Clock className="size-3" />
                            {new Date(m.kickoff_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="font-bold flex items-center gap-2">
                            <span>{flag(m.home_code)}</span>{m.home_team}
                            <span className="text-muted-foreground font-display text-base mx-1">VS</span>
                            {m.away_team}<span>{flag(m.away_code)}</span>
                          </span>
                        </div>
                        <Switch
                          checked={on}
                          disabled={savingMatchId === m.id}
                          onCheckedChange={() => toggleMatch(m.id)}
                          className="data-[state=checked]:bg-pitch"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: Bar["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 bg-pitch/15 text-pitch text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
        <CheckCircle2 className="size-3.5" /> Publicado
      </span>
    );
  if (status === "rejected")
    return <span className="bg-red-card/20 text-red-card text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Rechazado</span>;
  return <span className="bg-albice/15 text-albice text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">En revisión</span>;
}
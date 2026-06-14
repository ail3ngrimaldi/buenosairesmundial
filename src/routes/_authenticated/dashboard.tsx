import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { flag } from "@/components/TeamBadge";
import { FEATURE_OPTIONS, NEIGHBORHOODS_BY_ZONA, ZONAS, type Zona } from "@/lib/types";
import type { Bar, Match } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().min(4).max(200),
  neighborhood: z.string().trim().min(2).max(80),
  zona: z.enum(["CABA", "Zona Norte", "Zona Sur", "Zona Oeste"]),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  instagram: z.string().trim().max(80).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// ─── Main ────────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: bar, isLoading } = useQuery({
    queryKey: ["my-bar", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bars").select("*").eq("owner_id", user.id).maybeSingle();
      if (error) throw error;
      return data as Bar | null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stadium">
        <SiteHeader />
        <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!bar) {
    return <RegisterForm userId={user.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["my-bar", user.id] })} />;
  }

  return <BarDashboard bar={bar} userId={user.id} />;
}

// ─── Registration form (was /onboarding) ────────────────────────────────────

function RegisterForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [zona, setZona] = useState<Zona>("CABA");
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      address: fd.get("address"),
      neighborhood: fd.get("neighborhood"),
      zona,
      description: fd.get("description") || undefined,
      phone: fd.get("phone") || undefined,
      instagram: fd.get("instagram") || undefined,
      latitude: parseFloat(String(fd.get("latitude"))),
      longitude: parseFloat(String(fd.get("longitude"))),
    });
    if (!parsed.success) { toast.error("Revisá los datos del formulario"); return; }

    setSubmitting(true);
    const slug =
      parsed.data.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" + Math.random().toString(36).slice(2, 6);

    const { error } = await supabase.from("bars").insert({
      owner_id: userId,
      name: parsed.data.name,
      slug,
      address: parsed.data.address,
      neighborhood: parsed.data.neighborhood,
      zona: parsed.data.zona,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      description: parsed.data.description ?? null,
      phone: parsed.data.phone ?? null,
      instagram: parsed.data.instagram ?? null,
      features: Array.from(features),
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Listo! Tu bar quedó en revisión.");
    onSuccess();
  };

  const toggleFeature = (id: string) => {
    const n = new Set(features);
    n.has(id) ? n.delete(id) : n.add(id);
    setFeatures(n);
  };

  return (
    <div className="min-h-screen bg-stadium">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-2">Registrá tu bar</h1>
        <p className="text-muted-foreground mb-8">
          Completá los datos. Un admin va a revisar antes de publicarlo en el mapa.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Nombre del bar">
            <Input name="name" required maxLength={80} placeholder="Ej: La Mezzetta" />
          </Field>
          <Field label="Dirección">
            <Input name="address" required maxLength={200} placeholder="Av. Álvarez Thomas 1321" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Zona">
              <div className="flex flex-wrap gap-2">
                {ZONAS.map((z) => (
                  <button key={z} type="button" onClick={() => setZona(z)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border",
                      zona === z ? "bg-pitch border-pitch" : "border-border text-muted-foreground")}>
                    {z}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Barrio">
              <select name="neighborhood" required className="w-full bg-stadium-soft border border-border rounded-md h-10 px-3 text-sm">
                {NEIGHBORHOODS_BY_ZONA[zona].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitud" hint="Buscala en Google Maps">
              <Input name="latitude" required type="number" step="any" placeholder="-34.5805" />
            </Field>
            <Field label="Longitud">
              <Input name="longitude" required type="number" step="any" placeholder="-58.4660" />
            </Field>
          </div>
          <Field label="Descripción (opcional)">
            <Textarea name="description" maxLength={500} rows={3} placeholder="¿Qué hace especial a tu bar?" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono (opcional)">
              <Input name="phone" maxLength={40} />
            </Field>
            <Field label="Instagram (opcional)">
              <Input name="instagram" maxLength={80} placeholder="@tubar" />
            </Field>
          </div>
          <Field label="Servicios">
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFeature(f.id)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border",
                    features.has(f.id) ? "bg-pitch/20 border-pitch text-pitch" : "border-border text-muted-foreground")}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>

          <Button type="submit" disabled={submitting} className="bg-albice text-stadium hover:bg-albice/90 font-semibold w-full">
            {submitting ? "Enviando…" : "Enviar para aprobación"}
          </Button>
        </form>
      </main>
    </div>
  );
}

// ─── Bar dashboard (existing bar) ───────────────────────────────────────────

function BarDashboard({ bar, userId }: { bar: Bar; userId: string }) {
  const qc = useQueryClient();
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").order("kickoff_at");
      if (error) throw error;
      return data as Match[];
    },
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["broadcasts", bar.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bar_matches").select("match_id").eq("bar_id", bar.id);
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
              <p className="font-semibold mb-1">Tu bar está en revisión.</p>
              <p className="text-muted-foreground">
                Cuando lo aprobemos vas a aparecer en el mapa. Mientras tanto, podés ir cargando los partidos que vas a transmitir.
              </p>
            </div>
          </div>
        )}

        {bar.status === "rejected" && (
          <div className="my-6 p-4 rounded-xl bg-red-card/10 border border-red-card/30 flex items-start gap-3">
            <AlertCircle className="size-5 text-red-card mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Tu bar no fue aprobado.</p>
              <p className="text-muted-foreground">Contactanos para más información.</p>
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

// ─── Shared ──────────────────────────────────────────────────────────────────

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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

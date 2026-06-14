import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { flag } from "@/components/TeamBadge";
import { CheckCircle2, XCircle, Clock, Pencil, Check, X } from "lucide-react";
import type { Bar, Match } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/dashboard" });
  },
  component: AdminPanel,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

// Argentina is UTC-3 (no DST in June/July)
function toARTString(utcIso: string) {
  const d = new Date(utcIso);
  // Offset -3h
  const art = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return art.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function fromARTString(artLocal: string): string {
  // artLocal is "YYYY-MM-DDTHH:mm" in ART = UTC-3
  const d = new Date(artLocal + ":00Z"); // treat as UTC first
  const utc = new Date(d.getTime() + 3 * 60 * 60 * 1000); // add 3h to convert ART→UTC
  return utc.toISOString();
}

function formatARTDisplay(utcIso: string) {
  return new Date(utcIso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main component ─────────────────────────────────────────────────────────

function AdminPanel() {
  const { data: pendingBars = [], isLoading: loadingBars } = useQuery({
    queryKey: ["admin-bars-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bars")
        .select("*")
        .eq("status", "pending")
        .order("created_at");
      if (error) throw error;
      return data as Bar[];
    },
  });

  const { data: allBars = [] } = useQuery({
    queryKey: ["admin-bars-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bars")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Bar[];
    },
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff_at");
      if (error) throw error;
      return data as Match[];
    },
  });

  return (
    <div className="min-h-screen bg-stadium">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Panel de administración</p>
        <h1 className="font-display text-4xl md:text-5xl mb-8">Admin</h1>

        <Tabs defaultValue="pending">
          <TabsList className="mb-6 bg-card border border-border">
            <TabsTrigger value="pending" className="relative">
              Pendientes
              {pendingBars.length > 0 && (
                <span className="ml-2 bg-red-card text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingBars.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bares">Todos los bares</TabsTrigger>
            <TabsTrigger value="partidos">Partidos</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingBarsTab bars={pendingBars} loading={loadingBars} />
          </TabsContent>

          <TabsContent value="bares">
            <AllBarsTab bars={allBars} />
          </TabsContent>

          <TabsContent value="partidos">
            <MatchesTab matches={matches} loading={loadingMatches} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Tab: Pending bars ───────────────────────────────────────────────────────

function PendingBarsTab({ bars, loading }: { bars: Bar[]; loading: boolean }) {
  const qc = useQueryClient();

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("bars")
      .update({ status, ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}) })
      .eq("id", id);
    if (error) {
      toast.error("Error al actualizar");
    } else {
      toast.success(status === "approved" ? "¡Bar aprobado!" : "Bar rechazado");
      qc.invalidateQueries({ queryKey: ["admin-bars-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-bars-all"] });
    }
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  if (bars.length === 0)
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CheckCircle2 className="size-10 mx-auto mb-3 text-pitch opacity-50" />
        <p>No hay bares pendientes de revisión.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {bars.map((bar) => (
        <div key={bar.id} className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">{bar.name}</p>
            <p className="text-sm text-muted-foreground truncate">{bar.address}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{bar.zona}</Badge>
              <Badge variant="outline" className="text-xs">{bar.neighborhood}</Badge>
              {bar.features.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
            {bar.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{bar.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Registrado: {new Date(bar.created_at ?? "").toLocaleDateString("es-AR")}
              {bar.instagram && <> · <a href={`https://instagram.com/${bar.instagram.replace("@","")}`} target="_blank" rel="noreferrer" className="text-albice hover:underline">@{bar.instagram.replace("@","")}</a></>}
              {bar.phone && <> · {bar.phone}</>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => updateStatus(bar.id, "approved")}
              className="bg-pitch text-white hover:bg-pitch/90"
            >
              <CheckCircle2 className="size-4 mr-1" /> Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateStatus(bar.id, "rejected")}
            >
              <XCircle className="size-4 mr-1" /> Rechazar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: All bars ───────────────────────────────────────────────────────────

function AllBarsTab({ bars }: { bars: Bar[] }) {
  const qc = useQueryClient();

  const updateStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase
      .from("bars")
      .update({ status, ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}) })
      .eq("id", id);
    if (error) toast.error("Error al actualizar");
    else {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["admin-bars-all"] });
      qc.invalidateQueries({ queryKey: ["admin-bars-pending"] });
    }
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    approved: { label: "Publicado", className: "bg-pitch/15 text-pitch" },
    pending:  { label: "Pendiente", className: "bg-albice/15 text-albice" },
    rejected: { label: "Rechazado", className: "bg-red-card/15 text-red-card" },
  };

  if (bars.length === 0) return <p className="text-muted-foreground">No hay bares registrados.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
            <th className="text-left pb-3 pr-4">Bar</th>
            <th className="text-left pb-3 pr-4">Zona</th>
            <th className="text-left pb-3 pr-4">Estado</th>
            <th className="text-left pb-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bars.map((bar) => {
            const s = statusLabel[bar.status];
            return (
              <tr key={bar.id} className="hover:bg-card/50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium">{bar.name}</p>
                  <p className="text-xs text-muted-foreground">{bar.neighborhood}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{bar.zona}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${s.className}`}>
                    {s.label}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-1">
                    {bar.status !== "approved" && (
                      <Button size="sm" variant="ghost" className="text-pitch hover:text-pitch h-7 text-xs" onClick={() => updateStatus(bar.id, "approved")}>
                        Aprobar
                      </Button>
                    )}
                    {bar.status !== "rejected" && (
                      <Button size="sm" variant="ghost" className="text-red-card hover:text-red-card h-7 text-xs" onClick={() => updateStatus(bar.id, "rejected")}>
                        Rechazar
                      </Button>
                    )}
                    {bar.status !== "pending" && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground h-7 text-xs" onClick={() => updateStatus(bar.id, "pending")}>
                        Pendiente
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Matches ────────────────────────────────────────────────────────────

function MatchesTab({ matches, loading }: { matches: Match[]; loading: boolean }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const matchesByDay = (() => {
    const map = new Map<string, Match[]>();
    matches.forEach((m) => {
      // Group by ART date
      const artDate = new Date(new Date(m.kickoff_at).getTime() - 3 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (!map.has(artDate)) map.set(artDate, []);
      map.get(artDate)!.push(m);
    });
    return Array.from(map.entries()).sort();
  })();

  const startEdit = (m: Match) => {
    setEditingId(m.id);
    setEditValue(toARTString(m.kickoff_at));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    const utcIso = fromARTString(editValue);
    const { error } = await supabase.from("matches").update({ kickoff_at: utcIso }).eq("id", id);
    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Horario actualizado");
      qc.invalidateQueries({ queryKey: ["admin-matches"] });
      cancelEdit();
    }
  };

  if (loading) return <p className="text-muted-foreground">Cargando partidos…</p>;

  if (matches.length === 0)
    return (
      <p className="text-muted-foreground text-center py-12">
        No hay partidos cargados. Aplicá la migración SQL para cargarlos.
      </p>
    );

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        Los horarios se muestran en hora argentina (ART, UTC-3). Editá el campo y guardá para corregir.
      </p>
      {matchesByDay.map(([day, ms]) => (
        <div key={day}>
          <p className="text-xs font-bold text-albice mb-3 uppercase tracking-widest">
            {new Date(day + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
          <div className="space-y-2">
            {ms.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3"
                >
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {m.group_name ?? m.stage}
                  </span>
                  <span className="font-bold flex-1 flex items-center gap-2 min-w-0 flex-wrap">
                    <span>{flag(m.home_code)}</span>
                    <span className="truncate">{m.home_team}</span>
                    <span className="text-muted-foreground font-display text-sm mx-1">vs</span>
                    <span className="truncate">{m.away_team}</span>
                    <span>{flag(m.away_code)}</span>
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="datetime-local"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-xs w-48 bg-background"
                      />
                      <Button size="sm" variant="ghost" className="text-pitch h-8 w-8 p-0" onClick={() => saveEdit(m.id)}>
                        <Check className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground h-8 w-8 p-0" onClick={cancelEdit}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatARTDisplay(m.kickoff_at)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(m)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAdminEmail } from "@/lib/admin";
import { CheckCircle2, XCircle, Clock, CalendarCheck, MapPin, Phone, Instagram } from "lucide-react";
import type { Bar } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

type BarWithMeeting = Bar & { wants_meeting: boolean; created_at: string };
type StatusFilter = "pending" | "approved" | "rejected";

function AdminPanel() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  const admin = isAdminEmail(user.email);

  useEffect(() => {
    if (!admin) navigate({ to: "/" });
  }, [admin, navigate]);

  const { data: bars = [], isLoading } = useQuery({
    enabled: admin,
    queryKey: ["admin-bars", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bars")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as BarWithMeeting[];
    },
  });

  const { data: counts } = useQuery({
    enabled: admin,
    queryKey: ["admin-bar-counts"],
    queryFn: async () => {
      const [p, a, r] = await Promise.all([
        supabase.from("bars").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bars").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("bars").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return { pending: p.count ?? 0, approved: a.count ?? 0, rejected: r.count ?? 0 };
    },
  });

  const setStatus = async (barId: string, status: "approved" | "rejected") => {
    setActingId(barId);
    const patch: Record<string, unknown> = { status };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from("bars").update(patch).eq("id", barId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(status === "approved" ? "Bar aprobado ✓" : "Bar rechazado");
      qc.invalidateQueries({ queryKey: ["admin-bars"] });
      qc.invalidateQueries({ queryKey: ["admin-bar-counts"] });
    }
    setActingId(null);
  };

  if (!admin) return null;

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: `Pendientes${counts ? ` (${counts.pending})` : ""}` },
    { key: "approved", label: `Aprobados${counts ? ` (${counts.approved})` : ""}` },
    { key: "rejected", label: `Rechazados${counts ? ` (${counts.rejected})` : ""}` },
  ];

  return (
    <div className="min-h-screen bg-stadium">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Panel de administración</p>
          <h1 className="font-display text-4xl">Solicitudes de bares</h1>
        </div>

        <div className="flex gap-2 mb-8 border-b border-border pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                filter === t.key
                  ? "border-albice text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Cargando…</p>}

        {!isLoading && bars.length === 0 && (
          <div className="p-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No hay bares en esta categoría.</p>
          </div>
        )}

        <div className="space-y-4">
          {bars.map((bar) => (
            <div key={bar.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-xl font-bold">{bar.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enviado el {new Date(bar.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <StatusBadge status={bar.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                <Info icon={<MapPin className="size-3.5" />} label={`${bar.address} — ${bar.neighborhood}, ${bar.zona}`} />
                {bar.phone && <Info icon={<Phone className="size-3.5" />} label={bar.phone} />}
                {bar.instagram && <Info icon={<Instagram className="size-3.5" />} label={bar.instagram} />}
              </div>

              {bar.description && (
                <p className="text-sm text-muted-foreground bg-stadium/60 rounded-lg p-3 mb-3">{bar.description}</p>
              )}

              {bar.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bar.features.map((f) => (
                    <span key={f} className="text-[10px] font-semibold uppercase tracking-wider bg-stadium px-2 py-0.5 rounded border border-border text-muted-foreground">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {bar.wants_meeting && (
                <div className="flex items-center gap-2 text-albice text-xs font-semibold mb-3">
                  <CalendarCheck className="size-4" /> Quiere reunirse con el equipo antes de publicar
                </div>
              )}

              {bar.status === "pending" && (
                <div className="flex gap-3 pt-3 border-t border-border">
                  <Button size="sm" disabled={actingId === bar.id} onClick={() => setStatus(bar.id, "approved")}
                    className="bg-pitch text-foreground hover:bg-pitch/80 font-semibold">
                    <CheckCircle2 className="size-4 mr-1.5" /> Aprobar
                  </Button>
                  <Button size="sm" variant="outline" disabled={actingId === bar.id} onClick={() => setStatus(bar.id, "rejected")}
                    className="border-red-card/50 text-red-card hover:bg-red-card/10">
                    <XCircle className="size-4 mr-1.5" /> Rechazar
                  </Button>
                </div>
              )}
              {bar.status === "approved" && (
                <div className="flex gap-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" disabled={actingId === bar.id} onClick={() => setStatus(bar.id, "rejected")}
                    className="border-red-card/50 text-red-card hover:bg-red-card/10">
                    <XCircle className="size-4 mr-1.5" /> Dar de baja
                  </Button>
                </div>
              )}
              {bar.status === "rejected" && (
                <div className="flex gap-3 pt-3 border-t border-border">
                  <Button size="sm" disabled={actingId === bar.id} onClick={() => setStatus(bar.id, "approved")}
                    className="bg-pitch text-foreground hover:bg-pitch/80 font-semibold">
                    <CheckCircle2 className="size-4 mr-1.5" /> Aprobar igual
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Info({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-muted-foreground">{icon} {label}</p>
  );
}

function StatusBadge({ status }: { status: Bar["status"] }) {
  if (status === "approved")
    return <span className="inline-flex items-center gap-1 bg-pitch/15 text-pitch text-xs font-bold px-3 py-1 rounded-full"><CheckCircle2 className="size-3" /> Aprobado</span>;
  if (status === "rejected")
    return <span className="inline-flex items-center gap-1 bg-red-card/15 text-red-card text-xs font-bold px-3 py-1 rounded-full"><XCircle className="size-3" /> Rechazado</span>;
  return <span className="inline-flex items-center gap-1 bg-albice/15 text-albice text-xs font-bold px-3 py-1 rounded-full"><Clock className="size-3" /> Pendiente</span>;
}

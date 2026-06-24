import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { FEATURE_OPTIONS, NEIGHBORHOODS_BY_ZONA, ZONAS, type Zona } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().min(4).max(200),
  neighborhood: z.string().trim().min(2).max(80),
  zona: z.enum(["CABA", "Zona Norte", "Zona Sur", "Zona Oeste"]),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  instagram: z.string().trim().max(80).optional(),
});

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const q = encodeURIComponent(`${address}, Buenos Aires, Argentina`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "es" },
    });
    const json = await res.json();
    if (json[0]) return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
  } catch {}
  // fallback: centre of Buenos Aires
  return { lat: -34.6037, lng: -58.3816 };
}

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [zona, setZona] = useState<Zona>("CABA");
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [wantsMeeting, setWantsMeeting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [savedName, setSavedName] = useState("");

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
    });
    if (!parsed.success) {
      toast.error("Revisá los datos del formulario");
      return;
    }
    setSubmitting(true);

    const coords = await geocodeAddress(parsed.data.address);
    const slug =
      parsed.data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const { data: inserted, error } = await supabase
      .from("bars")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        slug,
        address: parsed.data.address,
        neighborhood: parsed.data.neighborhood,
        zona: parsed.data.zona,
        latitude: coords.lat,
        longitude: coords.lng,
        description: parsed.data.description ?? null,
        phone: parsed.data.phone ?? null,
        instagram: parsed.data.instagram ?? null,
        features: Array.from(features),
        wants_meeting: wantsMeeting,
        status: "pending",
      })
      .select()
      .single();

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    // Prime the cache so "Mi bar" shows the new bar instantly (no refetch wait).
    if (inserted) qc.setQueryData(["my-bar", user.id], inserted);
    setSavedName(parsed.data.name);
    setDone(true);
  };

  const toggleFeature = (id: string) => {
    const n = new Set(features);
    n.has(id) ? n.delete(id) : n.add(id);
    setFeatures(n);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-stadium">
        <SiteHeader />
        <main className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="flex justify-center mb-6">
            <span className="size-16 rounded-full bg-pitch/20 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-pitch" />
            </span>
          </div>
          <h1 className="font-display text-4xl mb-3">¡Solicitud enviada!</h1>
          <p className="text-muted-foreground mb-2">
            Estamos revisando los datos de <strong className="text-foreground">{savedName}</strong>. Apenas la aprobemos, te avisamos por alguno de los canales que informaste.
          </p>
          {wantsMeeting && (
            <p className="text-sm text-albice mt-3 flex items-center justify-center gap-2">
              <CalendarCheck className="size-4" /> Nos anotamos que querés reunirte — te contactamos pronto.
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-6 mb-8">
            Mientras tanto podés ir cargando los partidos que vas a transmitir en tu panel.
          </p>
          <Button onClick={() => navigate({ to: "/mibar" })} className="bg-albice text-stadium hover:bg-albice/90 font-semibold">
            Ir a mi panel
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stadium">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-2">Registrá tu bar</h1>
        <p className="text-muted-foreground mb-1">
          Completá el formulario y un admin va a revisar los datos en <strong className="text-foreground">menos de 24 horas</strong> antes de publicarlo en el mapa.
        </p>
        <p className="text-xs text-muted-foreground mb-8">El costo de inscripción es de <strong className="text-foreground">$7 USD</strong> — te lo confirmamos durante la revisión.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Nombre del bar *">
            <Input name="name" required maxLength={80} placeholder="Ej: La Mezzetta" />
          </Field>

          <Field label="Dirección completa *" hint="Incluí calle y número. Ej: Av. Álvarez Thomas 1321, Villa Crespo">
            <Input name="address" required maxLength={200} placeholder="Av. Álvarez Thomas 1321" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Zona *">
              <div className="flex flex-wrap gap-2">
                {ZONAS.map((z) => (
                  <button key={z} type="button" onClick={() => setZona(z)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                      zona === z ? "bg-pitch border-pitch text-foreground" : "border-border text-muted-foreground hover:border-pitch/60")}>
                    {z}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Barrio *">
              <select name="neighborhood" required className="w-full bg-stadium-soft border border-border rounded-md h-10 px-3 text-sm">
                {NEIGHBORHOODS_BY_ZONA[zona].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Descripción (opcional)" hint="¿Qué hace especial a tu bar? Capacidad, ambiente, pantallas…">
            <Textarea name="description" maxLength={500} rows={3} placeholder="Bar con 3 pantallas gigantes, cocina casera y buen ambiente familiar." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono (opcional)">
              <Input name="phone" maxLength={40} placeholder="+54 11 1234-5678" />
            </Field>
            <Field label="Instagram (opcional)">
              <Input name="instagram" maxLength={80} placeholder="@tubar" />
            </Field>
          </div>

          <Field label="Servicios que ofrecés">
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFeature(f.id)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    features.has(f.id) ? "bg-pitch/20 border-pitch text-pitch" : "border-border text-muted-foreground hover:border-pitch/50")}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>

          <div
            onClick={() => setWantsMeeting((v) => !v)}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
              wantsMeeting ? "border-albice bg-albice/10" : "border-border hover:border-albice/40"
            )}
          >
            <div className={cn(
              "mt-0.5 size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              wantsMeeting ? "bg-albice border-albice" : "border-border"
            )}>
              {wantsMeeting && <CheckCircle2 className="size-3 text-stadium" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Me gustaría reunirme con el equipo primero</p>
              <p className="text-xs text-muted-foreground mt-0.5">Podemos coordinar una charla antes de publicar tu bar.</p>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="bg-albice text-stadium hover:bg-albice/90 font-semibold w-full text-base py-5">
            {submitting ? "Enviando solicitud…" : "Enviar para revisión"}
          </Button>
        </form>
      </main>
    </div>
  );
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
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
    if (!parsed.success) {
      toast.error("Revisá los datos del formulario");
      return;
    }
    setSubmitting(true);
    const slug = parsed.data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("bars").insert({
      owner_id: user.id,
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
    navigate({ to: "/dashboard" });
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
        <p className="text-muted-foreground mb-8">Un admin va a revisar los datos antes de publicarlo en el mapa.</p>

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
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", zona === z ? "bg-pitch border-pitch" : "border-border text-muted-foreground")}>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guardarClubConfig } from "@/lib/actions/club";

type Config = {
  heroTitulo: string;
  heroSubtitulo: string | null;
  heroVideoUrl: string | null;
  introTitulo: string;
  introTexto: string | null;
  novedadesTexto: string | null;
  footerTexto: string;
};

export function ConfigForm({ config }: { config: Config }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await guardarClubConfig(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Página actualizada");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heroTitulo">Título del hero</Label>
        <Input id="heroTitulo" name="heroTitulo" defaultValue={config.heroTitulo} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="heroSubtitulo">Subtítulo del hero (opcional)</Label>
        <Input
          id="heroSubtitulo"
          name="heroSubtitulo"
          defaultValue={config.heroSubtitulo ?? ""}
          placeholder="Ej: Un lugar reservado para quienes estuvieron desde el principio."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="heroVideoUrl">Video de bienvenida (link YouTube/Vimeo)</Label>
        <Input
          id="heroVideoUrl"
          name="heroVideoUrl"
          defaultValue={config.heroVideoUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p className="text-xs text-muted-foreground">
          Pegá el link normal del video. Si lo dejás vacío, se muestra un espacio elegante
          reservado para el video.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="introTitulo">Título de &quot;Qué es este acceso&quot;</Label>
        <Input id="introTitulo" name="introTitulo" defaultValue={config.introTitulo} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="introTexto">Texto de &quot;Qué es este acceso&quot;</Label>
        <Textarea
          id="introTexto"
          name="introTexto"
          defaultValue={config.introTexto ?? ""}
          placeholder="Este acceso te acompaña. Cada tanto voy a abrir oportunidades reservadas solo para los Fundadores..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="novedadesTexto">Texto de &quot;Activar novedades&quot;</Label>
        <Textarea
          id="novedadesTexto"
          name="novedadesTexto"
          defaultValue={config.novedadesTexto ?? ""}
          placeholder="Dejame tu mail y te aviso únicamente cuando haya algo nuevo para Fundadores."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="footerTexto">Texto del footer</Label>
        <Input id="footerTexto" name="footerTexto" defaultValue={config.footerTexto} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CertificateTemplateRow {
  id: string;
  name: string;
  category: string | null;
  orientation: string | null;
  style_tags: string[] | null;
  is_premium: boolean | null;
  is_active: boolean | null;
  is_system: boolean | null;
  preview_image_url: string | null;
  background_image_url: string | null;
  design_config: any;
  supported_sources: string[] | null;
  created_by: string | null;
}

export function useCertificateTemplates() {
  const [templates, setTemplates] = useState<CertificateTemplateRow[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tpl } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("is_active", true)
      .order("is_premium", { ascending: true })
      .order("name");
    setTemplates((tpl as any) ?? []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: favs } = await supabase
        .from("coach_template_favorites" as any)
        .select("template_id")
        .eq("coach_id", user.id);
      setFavorites(new Set((favs ?? []).map((r: any) => r.template_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleFavorite = useCallback(async (templateId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (favorites.has(templateId)) {
      await supabase.from("coach_template_favorites" as any)
        .delete().eq("coach_id", user.id).eq("template_id", templateId);
      setFavorites((prev) => {
        const next = new Set(prev); next.delete(templateId); return next;
      });
    } else {
      await supabase.from("coach_template_favorites" as any)
        .insert({ coach_id: user.id, template_id: templateId });
      setFavorites((prev) => new Set(prev).add(templateId));
    }
  }, [favorites]);

  const duplicate = useCallback(async (tpl: CertificateTemplateRow, name?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("coach_template_customizations" as any)
      .insert({
        coach_id: user.id,
        base_template_id: tpl.id,
        name: name ?? `${tpl.name} (Custom)`,
        design_config: tpl.design_config ?? {},
        orientation: tpl.orientation ?? "landscape",
        background_image_url: tpl.background_image_url,
        preview_image_url: tpl.preview_image_url,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  return useMemo(
    () => ({ templates, favorites, loading, reload: load, toggleFavorite, duplicate }),
    [templates, favorites, loading, load, toggleFavorite, duplicate],
  );
}

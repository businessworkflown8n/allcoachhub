import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Blueprint = any;

export const useBlueprint = () => {
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("coach_blueprints").select("*").eq("coach_id", user.id).maybeSingle();
      if (data) {
        setBlueprint(data);
      } else {
        const { data: created } = await supabase.from("coach_blueprints").insert({ coach_id: user.id }).select("*").single();
        setBlueprint(created);
      }
      setLoading(false);
    })();
  }, [user]);

  const update = useCallback((patch: Partial<Blueprint>) => {
    setBlueprint((prev: any) => ({ ...prev, ...patch }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      if (!user) return;
      await supabase.from("coach_blueprints").update(patch as any).eq("coach_id", user.id);
    }, 600);
  }, [user]);

  const markStepComplete = useCallback((step: number) => {
    setBlueprint((prev: any) => {
      const completed = Array.from(new Set([...(prev?.completed_steps || []), step]));
      const next = { ...prev, completed_steps: completed, current_step: Math.max(prev?.current_step || 1, step + 1) };
      supabase.from("coach_blueprints").update({ completed_steps: completed, current_step: next.current_step }).eq("coach_id", user!.id).then(() => {});
      return next;
    });
  }, [user]);

  return { blueprint, loading, update, markStepComplete, setBlueprint };
};

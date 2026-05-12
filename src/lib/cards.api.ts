import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { PipelineCard, StageId, LeadOrigem } from "@/lib/types";

type DbCard = {
  id: string;
  cliente_id: string;
  stage: string;
  valor_estimado: number | string | null;
  potencia_kwp: number | string | null;
  consultor_id: string | null;
  dias_na_etapa_desde: string;
  origem: string;
  motivo_perda: string | null;
  created_at: string;
};

function dbToCard(r: DbCard): PipelineCard {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    stage: r.stage as StageId,
    valorEstimado: Number(r.valor_estimado ?? 0),
    potenciaKwp: Number(r.potencia_kwp ?? 0),
    consultorId: r.consultor_id ?? "",
    diasNaEtapaDesde: r.dias_na_etapa_desde,
    origem: r.origem as LeadOrigem,
    motivoPerda: r.motivo_perda ?? undefined,
    criadoEm: r.created_at,
  };
}

export function useCardsQuery() {
  return useQuery({
    queryKey: ["cards_pipeline"],
    queryFn: async (): Promise<PipelineCard[]> => {
      const { data, error } = await supabase
        .from("cards_pipeline")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(dbToCard);
    },
  });
}

export function useCardsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("cards_pipeline_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards_pipeline" },
        () => qc.invalidateQueries({ queryKey: ["cards_pipeline"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useAddCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Omit<PipelineCard, "id" | "criadoEm" | "diasNaEtapaDesde">,
    ): Promise<PipelineCard> => {
      const payload = {
        cliente_id: input.clienteId,
        stage: input.stage,
        valor_estimado: input.valorEstimado,
        potencia_kwp: input.potenciaKwp,
        consultor_id: input.consultorId || user?.id || null,
        origem: input.origem,
        motivo_perda: input.motivoPerda ?? null,
      };
      const { data, error } = await supabase
        .from("cards_pipeline")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return dbToCard(data as DbCard);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards_pipeline"] }),
  });
}

export function useMoveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      stage,
      motivoPerda,
    }: {
      id: string;
      stage: StageId;
      motivoPerda?: string;
    }) => {
      const { error } = await supabase
        .from("cards_pipeline")
        .update({
          stage,
          motivo_perda: stage === "perdido" ? motivoPerda ?? null : null,
          dias_na_etapa_desde: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards_pipeline"] }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<PipelineCard, "id" | "criadoEm">>;
    }) => {
      const out: Record<string, unknown> = {};
      if (patch.stage !== undefined) out.stage = patch.stage;
      if (patch.valorEstimado !== undefined) out.valor_estimado = patch.valorEstimado;
      if (patch.potenciaKwp !== undefined) out.potencia_kwp = patch.potenciaKwp;
      if (patch.consultorId !== undefined) out.consultor_id = patch.consultorId;
      if (patch.origem !== undefined) out.origem = patch.origem;
      if (patch.motivoPerda !== undefined) out.motivo_perda = patch.motivoPerda;
      const { error } = await supabase.from("cards_pipeline").update(out).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards_pipeline"] }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards_pipeline").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards_pipeline"] }),
  });
}

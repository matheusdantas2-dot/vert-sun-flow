import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notificacoes";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { brl } from "@/lib/format";

/**
 * Assina INSERT em proposta_aberturas via Supabase Realtime.
 * Quando uma abertura é detectada para uma proposta do consultor logado,
 * dispara notificação in-app.
 */
export function useAberturasRealtime(consultorId: string | undefined) {
  const { data: propostas = [] } = usePropostasQuery();
  const { data: clientes = [] } = useClientesQuery();

  useEffect(() => {
    if (!consultorId) return;

    const channel = supabase
      .channel("proposta_aberturas_realtime_global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proposta_aberturas" },
        (payload) => {
          const propostaId = (payload.new as { proposta_id?: string }).proposta_id;
          if (!propostaId) return;
          const proposta = propostas.find((p) => p.id === propostaId);
          if (!proposta) return;
          if (proposta.consultorId !== consultorId) return;
          const cliente = clientes.find((c) => c.id === proposta.clienteId);
          const valor = proposta.itens.reduce(
            (a, it) => a + (it.precoUnitario ?? 0) * it.quantidade,
            0,
          );
          notify.info(
            `🔔 ${cliente?.nome ?? "Cliente"} abriu sua proposta`,
            `${proposta.numero} · ${brl(valor)} — hora de ligar!`,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultorId, propostas, clientes]);
}

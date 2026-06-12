import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PropostaForm } from "@/components/propostas/PropostaForm";

const search = z.object({ clienteId: z.string().optional() });

export const Route = createFileRoute("/propostas/nova")({
  component: NovaProposta,
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Nova Proposta — VertCRM" }] }),
});

function NovaProposta() {
  const { clienteId } = Route.useSearch();
  return <PropostaForm initialClienteId={clienteId} />;
}

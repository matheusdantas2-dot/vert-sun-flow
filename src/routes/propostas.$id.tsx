import { createFileRoute } from "@tanstack/react-router";
import { PropostaForm } from "@/components/propostas/PropostaForm";

export const Route = createFileRoute("/propostas/$id")({
  component: EditarProposta,
  head: () => ({ meta: [{ title: "Editar Proposta — VertCRM" }] }),
});

function EditarProposta() {
  const { id } = Route.useParams();
  return <PropostaForm propostaId={id} />;
}

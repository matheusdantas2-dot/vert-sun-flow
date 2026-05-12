import { brl, initials } from "@/lib/format";
import { useMemo } from "react";
import { useProfilesQuery } from "@/lib/profiles.api";
import { useCardsQuery } from "@/lib/cards.api";
import { usePropostasQuery } from "@/lib/propostas.api";

export function RankingConsultores() {
  const { data: usuarios = [] } = useProfilesQuery();
  const { data: cards = [] } = useCardsQuery();
  const { data: propostas = [] } = usePropostasQuery();

  const ranking = useMemo(() => {
    return usuarios
      .map((u) => {
        const meusCards = cards.filter((c) => c.consultorId === u.id);
        const minhasPropostas = propostas.filter((p) => p.consultorId === u.id);
        const aceitas = minhasPropostas.filter((p) => p.status === "aceita").length;
        const conv = minhasPropostas.length > 0 ? (aceitas / minhasPropostas.length) * 100 : 0;
        const receita = minhasPropostas
          .filter((p) => p.status === "aceita")
          .reduce(
            (acc, p) =>
              acc + p.itens.reduce((a, it) => a + (it.precoUnitario ?? 0) * it.quantidade, 0),
            0,
          );
        return { u, propostas: minhasPropostas.length, conv, receita, cards: meusCards.length };
      })
      .filter((r) => r.propostas > 0 || r.cards > 0)
      .sort((a, b) => b.receita - a.receita);
  }, [usuarios, cards, propostas]);

  if (ranking.length === 0) {
    return <div className="text-sm text-muted-foreground py-6 text-center">Sem dados de equipe ainda.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left font-semibold py-2">Consultor</th>
            <th className="text-right font-semibold py-2">Propostas</th>
            <th className="text-right font-semibold py-2">Conversão</th>
            <th className="text-right font-semibold py-2">Receita</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r) => (
            <tr key={r.u.id} className="border-b border-border/50 last:border-0">
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: r.u.cor }}
                  >
                    {initials(r.u.nome)}
                  </div>
                  <div>
                    <div className="font-medium leading-tight">{r.u.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{r.cards} cards</div>
                  </div>
                </div>
              </td>
              <td className="text-right tabular-nums">{r.propostas}</td>
              <td className="text-right tabular-nums">
                <span className={r.conv >= 30 ? "text-vert font-semibold" : ""}>{r.conv.toFixed(0)}%</span>
              </td>
              <td className="text-right tabular-nums font-semibold">{brl(r.receita)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

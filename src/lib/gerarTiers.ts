// A partir de uma proposta "base" (Ideal), gera configurações para Básico e Premium.
// O consultor edita manualmente depois — estes são apenas defaults.
import type { Proposta, PropostaTier } from "./types";

type Partials = Partial<Proposta>;

export function gerarConfigTiers(propostaIdeal: Partials): Record<PropostaTier, Partials> {
  const itensIdeal = propostaIdeal.itens ?? [];

  // Básico: −22% no preço unitário, mesma quantidade
  const itensBasico = itensIdeal.map((it) => ({
    ...it,
    precoUnitario: +(it.precoUnitario * 0.78).toFixed(2),
  }));

  // Premium: +25% no preço unitário
  const itensPremium = itensIdeal.map((it) => ({
    ...it,
    precoUnitario: +(it.precoUnitario * 1.25).toFixed(2),
  }));

  return {
    basico: {
      ...propostaIdeal,
      tier: "basico",
      tierPrincipal: false,
      kitNome: propostaIdeal.kitNome ? `${propostaIdeal.kitNome} — Básico` : "Kit Básico",
      itens: itensBasico,
      cobertura: +(((propostaIdeal.cobertura ?? 1) * 0.8)).toFixed(2),
      observacoes: "Sistema básico com melhor custo-benefício imediato.",
    },
    ideal: {
      ...propostaIdeal,
      tier: "ideal",
      tierPrincipal: true,
      kitNome: propostaIdeal.kitNome ? `${propostaIdeal.kitNome} — Ideal` : "Kit Ideal",
      observacoes: propostaIdeal.observacoes ??
        "Sistema recomendado — equilíbrio entre investimento e retorno.",
    },
    premium: {
      ...propostaIdeal,
      tier: "premium",
      tierPrincipal: false,
      kitNome: propostaIdeal.kitNome ? `${propostaIdeal.kitNome} — Premium` : "Kit Premium",
      itens: itensPremium,
      cobertura: +(((propostaIdeal.cobertura ?? 1) * 1.2)).toFixed(2),
      observacoes: "Sistema premium com máxima geração e diferenciais completos.",
    },
  };
}

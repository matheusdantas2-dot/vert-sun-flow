// Cálculos financeiros para sistemas fotovoltaicos

/**
 * Dimensiona o sistema fotovoltaico
 * @param consumoKwh consumo médio mensal em kWh
 * @param irradiacao kWh/m²/dia (padrão Nordeste 5,2)
 * @param eficiencia 0-1 (padrão 0.80)
 * @param cobertura 0-1 (padrão 1.0)
 */
export function dimensionarSistema(
  consumoKwh: number,
  irradiacao = 5.2,
  eficiencia = 0.8,
  cobertura = 1.0,
) {
  const consumoDiario = (consumoKwh * cobertura) / 30;
  const potenciaKwp = consumoDiario / (irradiacao * eficiencia);
  const geracaoMensal = potenciaKwp * irradiacao * eficiencia * 30;
  return {
    potenciaKwp: +potenciaKwp.toFixed(2),
    geracaoMensal: +geracaoMensal.toFixed(0),
  };
}

/** Tabela Price — parcela mensal */
export function tabelaPrice(valor: number, taxaMensal: number, n: number) {
  if (taxaMensal <= 0) return valor / n;
  const i = taxaMensal / 100;
  return (valor * i) / (1 - Math.pow(1 + i, -n));
}

/** Faturas e economia */
export function calcularEconomia(opts: {
  consumoKwh: number;
  tarifa: number;
  geracaoKwh: number;
  inflacaoAA?: number;
}) {
  const { consumoKwh, tarifa, geracaoKwh } = opts;
  const faturaAtual = consumoKwh * tarifa;
  const consumoApos = Math.max(0, consumoKwh - geracaoKwh);
  // taxa mínima/disponibilidade (~50 kWh)
  const minimo = 50 * tarifa;
  const faturaSolar = Math.max(minimo, consumoApos * tarifa);
  const economiaMes = faturaAtual - faturaSolar;
  return {
    faturaAtual,
    faturaSolar,
    economiaMes,
    economiaAno: economiaMes * 12,
  };
}

/**
 * Payback em meses considerando reajuste tarifário e degradação anual dos painéis.
 * @param investimento  Valor total do sistema (R$)
 * @param economiaMes   Economia no primeiro mês (R$)
 * @param inflacaoAA    Reajuste tarifário anual em % (ex: 8 = 8% a.a.)
 * @param degradacaoAA  Degradação anual do painel em % (padrão 0.5% a.a. — típico Tier 1)
 */
export function payback(
  investimento: number,
  economiaMes: number,
  inflacaoAA = 0,
  degradacaoAA = 0.5,
) {
  if (economiaMes <= 0) return Infinity;
  // Fator mensal líquido: inflação tarifária aumenta a economia, degradação do painel a reduz
  const inflacaoMes  = Math.pow(1 + inflacaoAA  / 100, 1 / 12) - 1;
  const degradacaoMes = Math.pow(1 - degradacaoAA / 100, 1 / 12) - 1; // valor negativo
  let saldo = investimento;
  let mes = 0;
  let economia = economiaMes;
  while (saldo > 0 && mes < 600) {
    saldo -= economia;
    // Mês seguinte: tarifa sobe, geração cai
    economia *= (1 + inflacaoMes) * (1 + degradacaoMes);
    mes++;
  }
  return mes;
}

/**
 * Projeção de economia acumulada em 20 anos considerando degradação dos painéis.
 * @param economiaAno   Economia no primeiro ano (R$)
 * @param inflacaoAA    Reajuste tarifário anual em % (ex: 8)
 * @param degradacaoAA  Degradação anual do painel em % (padrão 0.5)
 */
export function projecao20Anos(
  economiaAno: number,
  inflacaoAA: number,
  degradacaoAA = 0.5,
) {
  let total = 0;
  let atual = economiaAno;
  for (let i = 0; i < 20; i++) {
    total += atual;
    // Ano seguinte: tarifa sobe, geração cai
    atual *= (1 + inflacaoAA / 100) * (1 - degradacaoAA / 100);
  }
  return total;
}

/**
 * Calcula a Taxa Interna de Retorno (TIR) anual aproximada via Newton-Raphson.
 * Fluxo de caixa: [-investimento, eco ano1, eco ano2 * fator, ...] por `anos` períodos.
 * @returns TIR em % a.a. (ex.: 18.4) ou NaN se não convergir
 */
export function calcularTIR(
  investimento: number,
  economiaAno1: number,
  inflacaoAA: number,
  degradacaoAA = 0.5,
  anos = 20,
): number {
  if (investimento <= 0 || economiaAno1 <= 0) return NaN;
  const fluxos: number[] = [-investimento];
  let eco = economiaAno1;
  for (let i = 0; i < anos; i++) {
    fluxos.push(eco);
    eco *= (1 + inflacaoAA / 100) * (1 - degradacaoAA / 100);
  }
  let tir = 0.15;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0, dnpv = 0;
    fluxos.forEach((fc, t) => {
      npv += fc / Math.pow(1 + tir, t);
      dnpv -= (t * fc) / Math.pow(1 + tir, t + 1);
    });
    if (dnpv === 0) break;
    const delta = npv / dnpv;
    tir -= delta;
    if (!Number.isFinite(tir)) return NaN;
    if (Math.abs(delta) < 1e-7) break;
  }
  return +(tir * 100).toFixed(1);
}

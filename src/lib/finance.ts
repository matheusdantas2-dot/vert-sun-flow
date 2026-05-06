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

/** Payback em meses dado economia mensal e investimento */
export function payback(investimento: number, economiaMes: number, inflacaoAA = 0) {
  if (economiaMes <= 0) return Infinity;
  if (inflacaoAA <= 0) return investimento / economiaMes;
  // payback considerando reajuste anual
  const inflacaoMes = Math.pow(1 + inflacaoAA / 100, 1 / 12) - 1;
  let saldo = investimento;
  let mes = 0;
  let economia = economiaMes;
  while (saldo > 0 && mes < 600) {
    saldo -= economia;
    economia *= 1 + inflacaoMes;
    mes++;
  }
  return mes;
}

/** Projeção de economia em 20 anos */
export function projecao20Anos(economiaAno: number, inflacaoAA: number) {
  let total = 0;
  let atual = economiaAno;
  for (let i = 0; i < 20; i++) {
    total += atual;
    atual *= 1 + inflacaoAA / 100;
  }
  return total;
}

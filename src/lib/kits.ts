// Kits de geração pré-definidos (estimativas para irradiação ~5,2 kWh/m²/dia, eficiência 80%)
import type { Produto } from "./types";

export interface KitPreset {
  id: string;
  nome: string;
  consumoKwh: number; // kWh/mês de referência
  potenciaKwpAprox: number;
  qtdModulos: number; // módulos de ~550W
  potenciaModuloRefW: number;
  potenciaInversorRefKw: number;
}

export const KITS_PRESETS: KitPreset[] = [
  { id: "k300", nome: "Kit 300 kWh", consumoKwh: 300, potenciaKwpAprox: 2.4, qtdModulos: 5, potenciaModuloRefW: 550, potenciaInversorRefKw: 3 },
  { id: "k500", nome: "Kit 500 kWh", consumoKwh: 500, potenciaKwpAprox: 4.0, qtdModulos: 8, potenciaModuloRefW: 550, potenciaInversorRefKw: 5 },
  { id: "k800", nome: "Kit 800 kWh", consumoKwh: 800, potenciaKwpAprox: 6.4, qtdModulos: 12, potenciaModuloRefW: 550, potenciaInversorRefKw: 6 },
  { id: "k1000", nome: "Kit 1.000 kWh", consumoKwh: 1000, potenciaKwpAprox: 8.0, qtdModulos: 15, potenciaModuloRefW: 550, potenciaInversorRefKw: 8 },
  { id: "k1500", nome: "Kit 1.500 kWh", consumoKwh: 1500, potenciaKwpAprox: 12.0, qtdModulos: 22, potenciaModuloRefW: 550, potenciaInversorRefKw: 12 },
  { id: "k2000", nome: "Kit 2.000 kWh", consumoKwh: 2000, potenciaKwpAprox: 16.0, qtdModulos: 30, potenciaModuloRefW: 550, potenciaInversorRefKw: 15 },
];

/** Seleciona melhor módulo/inversor do catálogo para o kit. */
export function escolherProdutosParaKit(kit: KitPreset, produtos: Produto[]) {
  const modulos = produtos.filter((p) => p.ativo && p.categoria === "modulo" && p.potenciaW);
  const inversores = produtos.filter((p) => p.ativo && p.categoria === "inversor");

  // módulo mais próximo da potência de referência
  const modulo = modulos.sort(
    (a, b) => Math.abs((a.potenciaW ?? 0) - kit.potenciaModuloRefW) - Math.abs((b.potenciaW ?? 0) - kit.potenciaModuloRefW),
  )[0];

  // inversor com kW mais próximo (≥ 80% da referência se possível)
  const inversor = inversores
    .map((p) => ({ p, kw: p.potenciaKw ?? (p.potenciaW ? p.potenciaW / 1000 : 0) }))
    .sort((a, b) => Math.abs(a.kw - kit.potenciaInversorRefKw) - Math.abs(b.kw - kit.potenciaInversorRefKw))[0]?.p;

  // Recalcula quantidade de módulos baseada na potência real do módulo escolhido
  const potW = modulo?.potenciaW ?? kit.potenciaModuloRefW;
  const qtdModulos = Math.max(1, Math.ceil((kit.potenciaKwpAprox * 1000) / potW));

  return { modulo, inversor, qtdModulos };
}

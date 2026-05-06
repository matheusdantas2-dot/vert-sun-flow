// Formatação pt-BR

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v || 0);

export const brlPrec = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);

export const num = (v: number, frac = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(v || 0);

export const kwh = (v: number) => `${num(v)} kWh`;
export const kwp = (v: number) => `${num(v, 2)} kWp`;
export const pct = (v: number, frac = 1) => `${num(v, frac)}%`;

export const dataBR = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

export const dataHoraBR = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const diasEntre = (isoStart: string, isoEnd: string = new Date().toISOString()) => {
  const a = new Date(isoStart).getTime();
  const b = new Date(isoEnd).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
};

export const formatDoc = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
};

export const formatTel = (tel: string) => {
  const t = tel.replace(/\D/g, "");
  if (t.length === 11) return t.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (t.length === 10) return t.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel;
};

export const initials = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

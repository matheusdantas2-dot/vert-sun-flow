import { useState, useEffect } from "react";
import { useAddCliente, useUpdateCliente } from "@/lib/clientes.api";
import { notify } from "@/lib/notificacoes";
import type { Cliente } from "@/lib/types";

const empty: Omit<Cliente, "id" | "criadoEm"> = {
  nome: "",
  tipo: "pf",
  documento: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: { cep: "", rua: "", numero: "", bairro: "", cidade: "", uf: "BA" },
  segmento: "residencial",
  origem: "trafego",
  concessionaria: "Neoenergia Coelba",
  grupoTarifario: "B1",
  consumoMedio: 0,
  tarifa: 0.92,
  rede: "monofasico",
  uc: "",
  ativo: true,
};

const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a?.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join("")
    );
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}
function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function isValidCPF(v: string): boolean {
  const c = v.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(c[9]) && calc(10) === parseInt(c[10]);
}

function isValidCNPJ(v: string): boolean {
  const c = v.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(c[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(c[12]) && calc(13) === parseInt(c[13]);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function ClienteFormModal({
  open,
  onClose,
  cliente,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onCreated?: (cliente: Cliente) => void;
}) {
  const addCliente = useAddCliente();
  const updateCliente = useUpdateCliente();
  const [data, setData] = useState<Omit<Cliente, "id" | "criadoEm">>(empty);
  const saving = addCliente.isPending || updateCliente.isPending;

  useEffect(() => {
    if (cliente) {
      const { id: _i, criadoEm: _c, ...rest } = cliente;
      setData(rest);
    } else setData(empty);
  }, [cliente, open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.nome.trim()) {
      notify.warning("Informe o nome", "O nome do cliente é obrigatório.");
      return;
    }
    if (data.documento.trim()) {
      const ok = data.tipo === "pf" ? isValidCPF(data.documento) : isValidCNPJ(data.documento);
      if (!ok) {
        notify.warning(
          data.tipo === "pf" ? "CPF inválido" : "CNPJ inválido",
          "Verifique os dígitos verificadores e tente novamente."
        );
        return;
      }
    }
    try {
      if (cliente) {
        await updateCliente.mutateAsync({ id: cliente.id, patch: data });
        notify.success("Cliente atualizado", data.nome);
      } else {
        const novo = await addCliente.mutateAsync(data);
        notify.success("Cliente cadastrado", data.nome);
        onCreated?.(novo);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      notify.warning("Falha ao salvar", msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} className="bg-card rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl mb-1">{cliente ? "Editar" : "Novo"} Cliente</h2>
        <p className="text-sm text-muted-foreground mb-5">Dados do cliente e perfil energético</p>

        <h3 className="font-semibold text-sm mb-3 text-vert">Dados pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="md:col-span-2"><Field label="Nome / Razão Social"><input className={inp} value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} required /></Field></div>
          <Field label="Tipo"><select className={inp} value={data.tipo} onChange={(e) => setData({ ...data, tipo: e.target.value as "pf" | "pj" })}><option value="pf">Pessoa Física</option><option value="pj">Pessoa Jurídica</option></select></Field>
          <Field label={data.tipo === "pf" ? "CPF" : "CNPJ"}><input className={inp} value={data.documento} onChange={(e) => setData({ ...data, documento: data.tipo === "pf" ? maskCPF(e.target.value) : maskCNPJ(e.target.value) })} /></Field>
          <Field label="Telefone"><input className={inp} value={data.telefone} onChange={(e) => { const m = maskPhone(e.target.value); setData({ ...data, telefone: m, whatsapp: data.whatsapp || m }); }} /></Field>
          <Field label="WhatsApp"><input className={inp} value={data.whatsapp} onChange={(e) => setData({ ...data, whatsapp: maskPhone(e.target.value) })} /></Field>
          <div className="md:col-span-3"><Field label="E-mail"><input type="email" className={inp} value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} /></Field></div>
        </div>

        <h3 className="font-semibold text-sm mb-3 text-vert">Endereço</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          <Field label="CEP"><input className={inp} value={data.endereco.cep} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, cep: maskCEP(e.target.value) } })} /></Field>
          <div className="col-span-3"><Field label="Rua"><input className={inp} value={data.endereco.rua} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, rua: e.target.value } })} /></Field></div>
          <Field label="Número"><input className={inp} value={data.endereco.numero} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, numero: e.target.value } })} /></Field>
          <Field label="UF"><input className={inp} maxLength={2} value={data.endereco.uf} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, uf: e.target.value.toUpperCase() } })} /></Field>
          <div className="col-span-2"><Field label="Bairro"><input className={inp} value={data.endereco.bairro} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, bairro: e.target.value } })} /></Field></div>
          <div className="col-span-4"><Field label="Cidade"><input className={inp} value={data.endereco.cidade} onChange={(e) => setData({ ...data, endereco: { ...data.endereco, cidade: e.target.value } })} /></Field></div>
        </div>

        <h3 className="font-semibold text-sm mb-3 text-vert">Classificação</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-5">
          <Field label="Segmento"><select className={inp} value={data.segmento} onChange={(e) => setData({ ...data, segmento: e.target.value as Cliente["segmento"] })}><option value="residencial">Residencial</option><option value="comercial">Comercial</option><option value="agronegocio">Agronegócio</option><option value="industrial">Industrial</option></select></Field>
          <Field label="Origem do lead"><select className={inp} value={data.origem} onChange={(e) => setData({ ...data, origem: e.target.value as Cliente["origem"] })}><option value="trafego">Tráfego Pago</option><option value="indicacao">Indicação</option><option value="prospeccao">Prospecção Ativa</option><option value="reativacao">Reativação</option><option value="licitacao">Licitação Pública</option></select></Field>
        </div>

        <h3 className="font-semibold text-sm mb-3 text-vert">Dados energéticos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="md:col-span-2"><Field label="Concessionária"><input className={inp} value={data.concessionaria} onChange={(e) => setData({ ...data, concessionaria: e.target.value })} /></Field></div>
          <Field label="Grupo tarifário"><select className={inp} value={data.grupoTarifario} onChange={(e) => setData({ ...data, grupoTarifario: e.target.value })}><option>B1</option><option>B2</option><option>B3</option><option>A4</option><option>A3</option></select></Field>
          <Field label="Tipo de rede"><select className={inp} value={data.rede} onChange={(e) => setData({ ...data, rede: e.target.value as Cliente["rede"] })}><option value="monofasico">Monofásico</option><option value="bifasico">Bifásico</option><option value="trifasico">Trifásico</option></select></Field>
          <Field label="Consumo médio (kWh)"><input type="number" className={inp} value={data.consumoMedio || ""} onChange={(e) => setData({ ...data, consumoMedio: +e.target.value })} /></Field>
          <Field label="Tarifa (R$/kWh)"><input type="number" step="0.01" className={inp} value={data.tarifa || ""} onChange={(e) => setData({ ...data, tarifa: +e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="N° UC"><input className={inp} value={data.uc} onChange={(e) => setData({ ...data, uc: e.target.value })} /></Field></div>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-border">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}

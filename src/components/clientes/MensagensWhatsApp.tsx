import { useMemo, useState } from "react";
import { Copy, MessageCircle, Sparkles, Send, CalendarPlus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl } from "@/lib/format";
import { dimensionarSistema, tabelaPrice, calcularEconomia, projecao20Anos } from "@/lib/finance";
import { useAddInteracao } from "@/lib/interacoes.api";
import type { Cliente } from "@/lib/types";

type AbaId = "primeiro" | "followup" | "proposta" | "fechamento" | "reativacao" | "posvenda";
type EstiloIA =
  | "consultivo"
  | "urgente"
  | "economico"
  | "premium"
  | "objecao_financiamento"
  | "recuperacao";

const ABAS: { id: AbaId; label: string }[] = [
  { id: "primeiro", label: "Primeiro contato" },
  { id: "followup", label: "Follow-up" },
  { id: "proposta", label: "Proposta" },
  { id: "fechamento", label: "Fechamento" },
  { id: "reativacao", label: "Reativação" },
  { id: "posvenda", label: "Pós-venda" },
];

const ESTILOS: { id: EstiloIA; label: string }[] = [
  { id: "consultivo", label: "Consultivo" },
  { id: "urgente", label: "Urgente" },
  { id: "economico", label: "Econômico" },
  { id: "premium", label: "Premium" },
  { id: "objecao_financiamento", label: "Objeção financiamento" },
  { id: "recuperacao", label: "Recuperação de lead" },
];

function primeiroNome(nome: string) {
  return nome.split(" ")[0] || nome;
}

export function MensagensWhatsApp({ cliente }: { cliente: Cliente }) {
  const dados = useMemo(() => {
    const valorConta = cliente.consumoMedio * cliente.tarifa;
    const gastoAnual = valorConta * 12;
    const sis = dimensionarSistema(cliente.consumoMedio);
    // Estimativa simples: R$ 4.500/kWp instalado
    const investimento = sis.potenciaKwp * 4500;
    const parcela = tabelaPrice(investimento, 1.49, 84); // 84 meses, ~1,49% a.m.
    const eco = calcularEconomia({
      consumoKwh: cliente.consumoMedio,
      tarifa: cliente.tarifa,
      geracaoKwh: sis.geracaoMensal,
    });
    const eco25 = projecao20Anos(eco.economiaAno, 8) * 1.25; // aproximação 25 anos
    return {
      nome: cliente.nome,
      primeiro: primeiroNome(cliente.nome),
      cidade: cliente.endereco.cidade,
      valorConta,
      gastoAnual,
      potenciaKwp: sis.potenciaKwp,
      investimento,
      parcela,
      economiaMes: eco.economiaMes,
      economiaAno: eco.economiaAno,
      economia25Anos: eco25,
    };
  }, [cliente]);

  const templates: Record<AbaId, string> = useMemo(() => {
    const d = dados;
    return {
      primeiro: `Olá ${d.primeiro}, tudo bem? Aqui é da Vert Energia Solar ☀️
Vi que você tem interesse em reduzir sua conta de luz aqui em ${d.cidade || "sua região"}.
Sua conta gira em torno de ${brl(d.valorConta)}/mês — com energia solar a economia pode passar de ${brl(d.economiaMes)}/mês.
Posso te enviar uma simulação personalizada e sem compromisso?`,

      followup: `${d.primeiro}, passando rapidinho pra saber se conseguiu pensar sobre a proposta.
Lembrando: você paga ${brl(d.gastoAnual)} por ano de energia hoje.
Com o sistema da Vert (${d.potenciaKwp.toFixed(2)} kWp), sua parcela ficaria em ${brl(d.parcela)}/mês — menor que a conta atual.
Quer que eu reserve um horário pra fechar?`,

      proposta: `${d.primeiro}, com base na sua conta de ${brl(d.valorConta)}/mês, você está pagando ${brl(d.gastoAnual)} por ano para a distribuidora.

Com o sistema da Vert (${d.potenciaKwp.toFixed(2)} kWp), sua parcela no financiamento seria ${brl(d.parcela)}/mês — e em 25 anos o sistema é seu.

Na prática: você troca uma conta cara por uma parcela menor que já gera retorno.
Faz sentido pra você?`,

      fechamento: `${d.primeiro}, tudo certo do seu lado pra fecharmos?
Posso já bloquear sua data de instalação e travar o preço atual dos equipamentos.
Economia projetada em 25 anos: ${brl(d.economia25Anos)}.
Te envio o contrato hoje?`,

      reativacao: `Oi ${d.primeiro}, faz um tempo que conversamos sobre energia solar.
A tarifa subiu novamente e refiz sua simulação: economia de ${brl(d.economiaMes)}/mês com parcela de ${brl(d.parcela)}.
Quer dar uma olhada nos novos números?`,

      posvenda: `${d.primeiro}, tudo certo com seu sistema solar? ☀️
Se estiver tudo funcionando bem, ficaria muito grato por uma indicação.
Para cada cliente indicado que fecha, temos benefícios exclusivos pra você.
Conhece alguém que também quer reduzir a conta de luz?`,
    };
  }, [dados]);

  const [aba, setAba] = useState<AbaId>("primeiro");
  const [textos, setTextos] = useState<Record<AbaId, string>>(templates);
  const [estilo, setEstilo] = useState<EstiloIA>("consultivo");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const addInteracao = useAddInteracao();

  // Sincroniza quando templates mudam (cliente atualizado)
  const textoAtual = textos[aba] ?? templates[aba];

  const setTexto = (v: string) => setTextos((s) => ({ ...s, [aba]: v }));

  const copiar = async () => {
    await navigator.clipboard.writeText(textoAtual);
    setCopiado(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopiado(false), 1500);
  };

  const abrirWhats = () => {
    const numero = cliente.whatsapp.replace(/\D/g, "");
    if (!numero) {
      toast.error("Cliente sem número de WhatsApp");
      return;
    }
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(textoAtual)}`;
    window.open(url, "_blank");
    addInteracao.mutate({
      cliente_id: cliente.id,
      tipo: "whatsapp",
      titulo: `Mensagem WhatsApp — ${ABAS.find((a) => a.id === aba)?.label}`,
      descricao: textoAtual,
    });
  };

  const agendarFollowup = () => {
    addInteracao.mutate(
      {
        cliente_id: cliente.id,
        tipo: "nota",
        titulo: "Follow-up agendado",
        descricao: `Lembrar de retomar contato. Última mensagem (${ABAS.find((a) => a.id === aba)?.label}):\n\n${textoAtual}`,
      },
      { onSuccess: () => toast.success("Follow-up registrado no histórico") },
    );
  };

  const gerarComIA = async () => {
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-sugestao", {
        body: {
          estilo,
          cliente: {
            nome: dados.nome,
            cidade: dados.cidade,
            valorConta: dados.valorConta,
            economiaMes: dados.economiaMes,
            parcela: dados.parcela,
            potenciaKwp: dados.potenciaKwp,
            gastoAnual: dados.gastoAnual,
            economia25Anos: dados.economia25Anos,
          },
          contexto: `Aba atual: ${ABAS.find((a) => a.id === aba)?.label}`,
        },
      });
      if (error) throw error;
      if (data?.mensagem) {
        setTexto(data.mensagem);
        toast.success("Mensagem gerada pela IA");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Falha ao gerar mensagem: " + (e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const restaurarTemplate = () => setTexto(templates[aba]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-none">Mensagens prontas</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Templates personalizados + IA para WhatsApp
            </p>
          </div>
        </div>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaId)}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto gap-1 bg-muted/60 p-1">
          {ABAS.map((a) => (
            <TabsTrigger key={a.id} value={a.id} className="text-[11px] px-2 py-1.5">
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ABAS.map((a) => (
          <TabsContent key={a.id} value={a.id} className="mt-3 space-y-3">
            {/* Resumo dados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <Info label="Conta atual" value={brl(dados.valorConta)} />
              <Info label="Economia/mês" value={brl(dados.economiaMes)} highlight />
              <Info label="Parcela" value={brl(dados.parcela)} />
              <Info label="Sistema" value={`${dados.potenciaKwp.toFixed(2)} kWp`} />
            </div>

            {/* IA controls */}
            <div className="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-vert-soft/40 border border-vert-soft">
              <Sparkles className="h-4 w-4 text-vert" />
              <span className="text-xs font-semibold text-vert-dark">Estilo IA:</span>
              <select
                value={estilo}
                onChange={(e) => setEstilo(e.target.value as EstiloIA)}
                className="text-xs bg-card border border-border rounded-md px-2 py-1"
              >
                {ESTILOS.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
              <button
                onClick={gerarComIA}
                disabled={gerando}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-vert text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Gerar com IA
              </button>
              <button
                onClick={restaurarTemplate}
                className="text-[11px] text-muted-foreground hover:text-vert underline"
              >
                Restaurar template
              </button>
            </div>

            {/* Editable preview */}
            <textarea
              value={textoAtual}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none font-sans whitespace-pre-wrap"
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={abrirWhats}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600"
              >
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
              </button>
              <button
                onClick={copiar}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
              <button
                onClick={() => {
                  addInteracao.mutate({
                    cliente_id: cliente.id,
                    tipo: "proposta",
                    titulo: "Proposta enviada via WhatsApp",
                    descricao: textoAtual,
                  }, { onSuccess: () => toast.success("Registrado como proposta enviada") });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                <Send className="h-4 w-4" /> Marcar como enviada
              </button>
              <button
                onClick={agendarFollowup}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                <CalendarPlus className="h-4 w-4" /> Agendar follow-up
              </button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-md border ${highlight ? "border-vert/40 bg-vert-soft/30" : "border-border bg-muted/40"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${highlight ? "text-vert-dark" : ""}`}>{value}</div>
    </div>
  );
}

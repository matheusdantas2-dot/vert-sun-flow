import { useEffect, useMemo, useState } from "react";
import { X, Copy, Check, ExternalLink, Eye, Trash2, Link2, Clock, Loader2, MapPin, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import {
  type ShareRow,
  type AberturaRow,
  criarShareProposta,
  listarAberturas,
  listarSharesProposta,
  revogarShare,
  urlShare,
} from "@/lib/shareProposta";
import { notify } from "@/lib/notificacoes";
import { gerarPdfProposta } from "@/lib/pdfProposta";
import { gerarPdfPropostaResumo } from "@/lib/pdfPropostaResumo";
import { useStore } from "@/lib/store";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProdutosQuery } from "@/lib/produtos.api";
import { useProfilesQuery } from "@/lib/profiles.api";

interface Props {
  propostaId: string;
  onClose: () => void;
}

function tempoRel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

function dataHoraBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dispositivo(ua: string | null) {
  if (!ua) return "Desconhecido";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Outro";
}

export function CompartilharPropostaModal({ propostaId, onClose }: Props) {
  const { data: propostas = [] } = usePropostasQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: produtos = [] } = useProdutosQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const empresa = useStore((s) => s.empresa);

  const proposta = propostas.find((p) => p.id === propostaId);
  const cliente = clientes.find((c) => c.id === proposta?.clienteId);
  const profile = profiles.find((u) => u.id === proposta?.consultorId);
  const consultor = profile
    ? { id: profile.id, nome: profile.nome, email: profile.email ?? "", perfil: "consultor" as const, cor: profile.cor, ativo: profile.ativo }
    : undefined;

  const [shares, setShares] = useState<ShareRow[]>([]);
  const [aberturas, setAberturas] = useState<AberturaRow[]>([]);
  const [criando, setCriando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [diasValidade, setDiasValidade] = useState(7);
  const [modeloPdf, setModeloPdf] = useState<"completa" | "resumo">("completa");

  const ativos = useMemo(
    () => shares.filter((s) => s.ativo && new Date(s.expira_em).getTime() > Date.now()),
    [shares],
  );

  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      try {
        const [s, a] = await Promise.all([listarSharesProposta(propostaId), listarAberturas(propostaId)]);
        if (cancelado) return;
        setShares(s);
        setAberturas(a);
      } catch (e: any) {
        notify.error("Erro ao carregar compartilhamentos", e?.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };
    carregar();
    return () => {
      cancelado = true;
    };
  }, [propostaId]);

  // Realtime: novas aberturas
  useEffect(() => {
    const ch = supabase
      .channel(`aberturas-${propostaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proposta_aberturas", filter: `proposta_id=eq.${propostaId}` },
        (payload) => {
          const nova = payload.new as AberturaRow;
          setAberturas((prev) => [nova, ...prev]);
          notify.info(
            "Cliente abriu a proposta",
            `${proposta?.numero ?? ""} · ${dispositivo(nova.user_agent)} · ${dataHoraBR(nova.aberto_em)}`,
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "propostas_compartilhadas", filter: `proposta_id=eq.${propostaId}` },
        (payload) => {
          const upd = payload.new as ShareRow;
          setShares((prev) => prev.map((s) => (s.id === upd.id ? upd : s)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [propostaId, proposta?.numero]);

  // Gera QR codes para cada share ativo
  useEffect(() => {
    ativos.forEach(async (s) => {
      if (qrUrls[s.id]) return;
      const dataUrl = await QRCode.toDataURL(urlShare(s.token), { width: 280, margin: 1, color: { dark: "#0d5234", light: "#ffffff" } });
      setQrUrls((prev) => ({ ...prev, [s.id]: dataUrl }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const gerarLink = async () => {
    if (!proposta || !cliente) return;
    setCriando(true);
    try {
      const gerador = modeloPdf === "resumo" ? gerarPdfPropostaResumo : gerarPdfProposta;
      const blob = gerador({ proposta, cliente, consultor, produtos, empresa, modo: "blob-data" });
      if (!(blob instanceof Blob)) throw new Error("Falha ao gerar PDF");
      const novo = await criarShareProposta({
        propostaId: proposta.id,
        propostaNumero: proposta.numero,
        clienteNome: cliente.nome,
        pdfBlob: blob,
        diasValidade,
      });
      setShares((prev) => [novo, ...prev]);
      notify.success("Link gerado", `Pronto para enviar para ${cliente.nome}`);
    } catch (e: any) {
      notify.error("Erro ao gerar link", e?.message);
    } finally {
      setCriando(false);
    }
  };

  const copiar = async (token: string) => {
    const url = urlShare(token);
    await navigator.clipboard.writeText(url);
    setCopiado(token);
    notify.success("Link copiado", url);
    setTimeout(() => setCopiado(null), 2000);
  };

  const compartilharWhatsApp = (token: string) => {
    if (!cliente) return;
    const url = urlShare(token);
    const tel = (cliente.telefone || "").replace(/\D/g, "");
    const txt = encodeURIComponent(
      `Olá ${cliente.nome.split(" ")[0]}! Aqui está sua proposta de energia solar da Vert Energie:\n${url}\n\nQualquer dúvida estou à disposição.`,
    );
    const wa = tel ? `https://wa.me/55${tel}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(wa, "_blank");
  };

  const compartilharEmail = (token: string) => {
    if (!cliente) return;
    const url = urlShare(token);
    const subj = encodeURIComponent(`Proposta Vert Energie — ${proposta?.numero}`);
    const body = encodeURIComponent(
      `Olá ${cliente.nome},\n\nSegue o link da sua proposta de energia solar:\n${url}\n\nFico à disposição para esclarecer qualquer dúvida.\n\n${consultor?.nome ?? "Vert Energie"}`,
    );
    window.location.href = `mailto:${cliente.email ?? ""}?subject=${subj}&body=${body}`;
  };

  const revogar = async (id: string) => {
    if (!confirm("Desativar este link? O cliente não conseguirá mais abrir.")) return;
    try {
      await revogarShare(id);
      setShares((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: false } : s)));
      notify.warning("Link revogado");
    } catch (e: any) {
      notify.error("Erro ao revogar", e?.message);
    }
  };

  if (!proposta || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-vert-dark text-white shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-vert-glow">Compartilhar proposta</div>
            <div className="font-display font-bold text-lg truncate">{proposta.numero} · {cliente.nome}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Gerar novo link */}
          <section className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Validade do link</label>
                <select
                  value={diasValidade}
                  onChange={(e) => setDiasValidade(Number(e.target.value))}
                  className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
                >
                  <option value={1}>1 dia</option>
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>
              <button
                onClick={gerarLink}
                disabled={criando}
                className="h-10 inline-flex items-center gap-2 px-5 rounded-lg bg-vert text-white font-semibold hover:bg-vert-dark disabled:opacity-60"
              >
                {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {criando ? "Gerando PDF e link…" : "Gerar novo link"}
              </button>
              <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                O PDF é hospedado de forma segura. Cada abertura pelo cliente é registrada abaixo.
              </p>
            </div>
          </section>

          {/* Lista de links ativos */}
          <section>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Links ativos ({ativos.length})
            </h3>
            {carregando ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>
            ) : ativos.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                Nenhum link ativo. Gere um novo acima para enviar ao cliente.
              </div>
            ) : (
              <ul className="space-y-3">
                {ativos.map((s) => {
                  const url = urlShare(s.token);
                  return (
                    <li key={s.id} className="rounded-lg border border-border p-4 bg-card">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="shrink-0">
                          {qrUrls[s.id] ? (
                            <img src={qrUrls[s.id]} alt="QR" className="w-24 h-24 rounded border border-border" />
                          ) : (
                            <div className="w-24 h-24 rounded border border-border bg-muted animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            Expira em {dataHoraBR(s.expira_em)}
                            <span className="mx-1">·</span>
                            <Eye className="h-3.5 w-3.5" />
                            {s.total_aberturas} {s.total_aberturas === 1 ? "abertura" : "aberturas"}
                            {s.ultima_abertura && <span>· última {tempoRel(s.ultima_abertura)}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={url}
                              className="flex-1 h-9 px-3 rounded border border-border bg-muted text-xs font-mono truncate"
                              onFocus={(e) => e.currentTarget.select()}
                            />
                            <button
                              onClick={() => copiar(s.token)}
                              className="h-9 px-3 rounded border border-border hover:bg-accent inline-flex items-center gap-1.5 text-xs font-semibold"
                            >
                              {copiado === s.token ? <Check className="h-3.5 w-3.5 text-vert" /> : <Copy className="h-3.5 w-3.5" />}
                              Copiar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => compartilharWhatsApp(s.token)}
                              className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#25D366] text-white hover:brightness-95"
                            >
                              WhatsApp
                            </button>
                            <button
                              onClick={() => compartilharEmail(s.token)}
                              className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-accent"
                            >
                              E-mail
                            </button>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-accent"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Abrir
                            </a>
                            <button
                              onClick={() => revogar(s.id)}
                              className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-rose-700 hover:bg-rose-50 ml-auto"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Revogar
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Histórico de aberturas */}
          <section>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" /> Histórico de aberturas ({aberturas.length})
            </h3>
            {aberturas.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                Nenhuma abertura registrada ainda. Você será notificado em tempo real.
              </div>
            ) : (
              <ol className="relative border-l-2 border-border ml-2 space-y-3">
                {aberturas.map((a) => (
                  <li key={a.id} className="ml-4 pl-4 relative">
                    <span className="absolute -left-[9px] top-1.5 w-3 h-3 rounded-full bg-vert ring-2 ring-card" />
                    <div className="text-sm font-semibold">{dataHoraBR(a.aberto_em)} <span className="text-xs font-normal text-muted-foreground">· {tempoRel(a.aberto_em)}</span></div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3" /> {dispositivo(a.user_agent)}</span>
                      {a.ip && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.ip}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  estilo:
    | "consultivo"
    | "urgente"
    | "economico"
    | "premium"
    | "objecao_financiamento"
    | "recuperacao";
  cliente: {
    nome: string;
    cidade?: string;
    valorConta: number;
    economiaMes: number;
    parcela: number;
    potenciaKwp: number;
    gastoAnual: number;
    economia25Anos: number;
  };
  contexto?: string;
}

const ESTILO_PROMPT: Record<Body["estilo"], string> = {
  consultivo:
    "Tom consultivo, educativo e empático. Faça uma pergunta no final que leve à reflexão.",
  urgente:
    "Tom de urgência (sem ser apelativo). Mencione aumento da tarifa de energia e oportunidade de travar economia agora.",
  economico:
    "Tom direto focado em números: economia mensal, anual e em 25 anos. Curto e impactante.",
  premium:
    "Tom premium/consultoria executiva. Vocabulário sofisticado, foco em patrimônio, valorização do imóvel e independência energética.",
  objecao_financiamento:
    "Quebre a objeção do financiamento mostrando que a parcela é menor que a conta atual. Comparação direta.",
  recuperacao:
    "Mensagem para reativar lead frio, leve e sem pressão. Ofereça revisar simulação com novos números.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const c = body.cliente;
    const fmt = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

    const dados = `
- Nome: ${c.nome}
- Cidade: ${c.cidade ?? "—"}
- Conta de luz mensal: ${fmt(c.valorConta)}
- Gasto anual atual: ${fmt(c.gastoAnual)}
- Parcela do financiamento solar: ${fmt(c.parcela)}/mês
- Economia mensal estimada: ${fmt(c.economiaMes)}
- Economia projetada em 25 anos: ${fmt(c.economia25Anos)}
- Potência do sistema: ${c.potenciaKwp.toFixed(2)} kWp
`.trim();

    const system = `Você é um consultor comercial da Vert Energia Solar. Escreva mensagens de WhatsApp para abordagem de leads de energia solar.

Regras OBRIGATÓRIAS:
- Português do Brasil, tom natural e humano (nada de robotizado).
- Máximo 5 linhas curtas. Use quebras de linha para leitura fácil.
- Sempre cite o primeiro nome do cliente.
- Use no máximo 1 emoji (opcional).
- Termine com uma pergunta de engajamento OU CTA claro.
- NÃO use markdown, asteriscos, hashtags ou listas.
- NÃO invente dados que não foram fornecidos.
- Retorne APENAS o texto da mensagem, sem aspas, sem explicações.`;

    const user = `Estilo: ${body.estilo}
${ESTILO_PROMPT[body.estilo]}

Dados do cliente:
${dados}

${body.contexto ? `Contexto adicional: ${body.contexto}` : ""}

Escreva a mensagem agora.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Falha IA: ${t}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const mensagem = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ mensagem }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

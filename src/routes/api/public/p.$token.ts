// Endpoint público que serve o PDF compartilhado e registra a abertura.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta VertCRM</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f5f6f7;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;color:#1f2937}.card{background:#fff;border-radius:14px;padding:32px;max-width:460px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08)}.logo{font-weight:800;color:#0d5234;font-size:22px;margin-bottom:8px}h1{font-size:18px;margin:8px 0}p{color:#555;font-size:14px;line-height:1.5}</style></head><body><div class="card"><div class="logo">VertCRM</div>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/p/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { token } = params;
        if (!token) return html("<h1>Link inválido</h1>", 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: share, error } = await supabase
          .from("propostas_compartilhadas")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (error || !share) {
          return html("<h1>Proposta não encontrada</h1><p>O link informado é inválido ou foi removido.</p>", 404);
        }
        if (!share.ativo) {
          return html("<h1>Link revogado</h1><p>Este link de proposta foi desativado pelo consultor.</p>", 410);
        }
        if (new Date(share.expira_em).getTime() < Date.now()) {
          return html("<h1>Link expirado</h1><p>Solicite um novo link ao seu consultor VertCRM.</p>", 410);
        }

        // Registra abertura
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          null;
        const ua = request.headers.get("user-agent") || null;
        const ref = request.headers.get("referer") || null;

        await supabase.from("proposta_aberturas").insert({
          share_id: share.id,
          proposta_id: share.proposta_id,
          ip,
          user_agent: ua,
          referer: ref,
        });
        await supabase
          .from("propostas_compartilhadas")
          .update({
            total_aberturas: (share.total_aberturas ?? 0) + 1,
            ultima_abertura: new Date().toISOString(),
          })
          .eq("id", share.id);

        // Redireciona para o PDF público
        const { data: pub } = supabase.storage.from("propostas-pdf").getPublicUrl(share.pdf_path);
        const pdfUrl = pub.publicUrl;

        return new Response(null, {
          status: 302,
          headers: {
            Location: pdfUrl,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

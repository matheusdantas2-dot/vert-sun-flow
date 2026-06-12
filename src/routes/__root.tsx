import { Outlet, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAberturasRealtime } from "@/hooks/useAberturasRealtime";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

import appCss from "../styles.css?url";

const PUBLIC_PREFIXES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/reset-password",
  "/cliente/acompanhamento/",
];

function isPublicPath(path: string) {
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VertCRM — Gestão Solar" },
      { name: "description", content: "CRM completo VertCRM para gestão de leads, propostas e projetos solares." },
      { property: "og:title", content: "VertCRM — Gestão Solar" },
      { name: "twitter:title", content: "VertCRM — Gestão Solar" },
      { property: "og:description", content: "CRM completo VertCRM para gestão de leads, propostas e projetos solares." },
      { name: "twitter:description", content: "CRM completo VertCRM para gestão de leads, propostas e projetos solares." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8765e576-ff55-4b0e-8303-3237d1b3364c/id-preview-5f771f6a--c7043e1b-e213-4c2e-a404-1d1c52a595bb.lovable.app-1778094698574.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8765e576-ff55-4b0e-8303-3237d1b3364c/id-preview-5f771f6a--c7043e1b-e213-4c2e-a404-1d1c52a595bb.lovable.app-1778094698574.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-7xl font-extrabold text-vert-dark">404</h1>
        <p className="mt-2 text-muted-foreground">Esta página não existe.</p>
        <a href="/" className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold">
          Voltar ao Dashboard
        </a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const publico = isPublicPath(location.pathname);

  useEffect(() => {
    if (!loading && !user && !publico) {
      navigate({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  }, [loading, user, publico, location.href, navigate]);

  if (publico) return <Outlet />;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-vert" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

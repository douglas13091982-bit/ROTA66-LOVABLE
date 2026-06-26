import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { registerAppServiceWorker } from "@/lib/register-sw";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ROTA 66" },
      { name: "description", content: "Plataforma de entregas e coletas" },
      { name: "author", content: "ROTA 66" },
      { property: "og:title", content: "ROTA 66" },
      { property: "og:description", content: "Plataforma de entregas e coletas" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@rota66" },
      { name: "twitter:title", content: "ROTA 66" },
      { name: "twitter:description", content: "Plataforma de entregas e coletas" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/85H1Xj7XI9dnBTV14pAbFErSOmW2/social-images/social-1782498933692-ICONE_APK.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/85H1Xj7XI9dnBTV14pAbFErSOmW2/social-images/social-1782498933692-ICONE_APK.webp" },
      { name: "theme-color", content: "#cc2229" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ROTA 66" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      // Manifest estático + ícones válidos para instalabilidade PWA
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700;800;900&family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('rota-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}`,
          }}
        />
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
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerAppServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <InstallPrompt />
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

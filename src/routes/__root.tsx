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
import { AndroidApkRedirect } from "@/components/AndroidApkRedirect";
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

      // ===== iOS splash screens (apple-touch-startup-image) =====
      // Portrait
      ...([
        { w: 430, h: 932, r: 3 },   // iPhone 15/14 Pro Max
        { w: 393, h: 852, r: 3 },   // iPhone 15/14 Pro
        { w: 428, h: 926, r: 3 },   // iPhone 12/13 Pro Max
        { w: 390, h: 844, r: 3 },   // iPhone 14/13/12
        { w: 414, h: 896, r: 3 },   // iPhone XS Max / 11 Pro Max
        { w: 375, h: 812, r: 3 },   // iPhone X/XS/11 Pro
        { w: 414, h: 896, r: 2 },   // iPhone XR / 11
        { w: 414, h: 736, r: 3 },   // iPhone 8 Plus
        { w: 375, h: 667, r: 2 },   // iPhone 8/SE2/7/6
        { w: 320, h: 568, r: 2 },   // iPhone SE 1st
        { w: 1024, h: 1366, r: 2 }, // iPad Pro 12.9"
        { w: 834, h: 1194, r: 2 },  // iPad Pro 11"
        { w: 834, h: 1112, r: 2 },  // iPad Pro 10.5"
        { w: 810, h: 1080, r: 2 },  // iPad 10.2"
        { w: 768, h: 1024, r: 2 },  // iPad 9.7"
      ].flatMap(({ w, h, r }) => [
        {
          rel: "apple-touch-startup-image",
          href: `/splash/splash-${w * r}x${h * r}.png`,
          media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
        },
        {
          rel: "apple-touch-startup-image",
          href: `/splash/splash-${h * r}x${w * r}.png`,
          media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: landscape)`,
        },
      ])),


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
            __html: `try{document.documentElement.classList.remove('light');localStorage.removeItem('rota-theme');}catch(e){}`,
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
        <AndroidApkRedirect />
        <InstallPrompt />
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

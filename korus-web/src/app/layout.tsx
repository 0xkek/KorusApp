'use client';

import { Poppins } from "next/font/google";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { WalletAuthProvider } from "@/contexts/WalletAuthContext";
import { ParticleSystem } from "@/components/ParticleSystem";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import NetworkBanner from "@/components/NetworkBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { reportWebVitals, analytics } from "@/utils/analytics";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Track page views
  useEffect(() => {
    if (pathname) {
      analytics.pageView(pathname);
    }
  }, [pathname]);

  // Report Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS(reportWebVitals);
        onFCP(reportWebVitals);
        onLCP(reportWebVitals);
        onTTFB(reportWebVitals);
        onINP(reportWebVitals); // INP replaces FID in web-vitals v3+
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        No <title> here. This layout is a client component so it cannot export
        `metadata`, and a hardcoded title emitted a SECOND <title> on routes
        that define their own (e.g. /post/[id], whose title carries the post
        text for link previews). Routes with generateMetadata supply their own
        title; app/page.tsx covers the site default. The og/twitter defaults
        below stay as a fallback and are overridden per route.
      */}
      <head>
        <meta name="description" content="The social platform built on Solana. Connect your wallet, share posts, play games with SOL wagers, earn reputation, and join exclusive events." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Korus.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/png" href="/korus-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`} style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
        <ErrorBoundary>
          <ThemeProvider>
            <WalletContextProvider>
              <WalletAuthProvider>
                <ToastProvider>
                  <NetworkBanner />
                  {children}
                  <ParticleSystem />
                </ToastProvider>
              </WalletAuthProvider>
            </WalletContextProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

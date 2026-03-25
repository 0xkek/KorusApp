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
      <head>
        <title>Korus.fun — Solana Social Platform</title>
        <meta name="description" content="The social platform built on Solana. Connect your wallet, share posts, play games with SOL wagers, earn reputation, and join exclusive events." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Korus.fun — Solana Social Platform" />
        <meta property="og:description" content="Connect, play, and earn on Solana. Games with SOL wagers, reputation system, premium features, and community events." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Korus.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Korus.fun — Solana Social Platform" />
        <meta name="twitter:description" content="Connect, play, and earn on Solana." />
        <link rel="icon" type="image/png" href="/korus-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className={`${poppins.variable} font-sans antialiased bg-[#0a0a0a] text-[#fafafa]`}>
        <ErrorBoundary>
          <ThemeProvider>
            <WalletContextProvider>
              <WalletAuthProvider>
                <ToastProvider>
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

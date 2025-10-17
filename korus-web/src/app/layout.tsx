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
      <body className={`${poppins.variable} font-sans antialiased`}>
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

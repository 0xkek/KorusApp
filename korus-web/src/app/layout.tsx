'use client';

import { Poppins } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { ParticleSystem } from "@/components/ParticleSystem";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ThemeProvider>
          <WalletContextProvider>
            <ToastProvider>
              {children}
              <ParticleSystem />
            </ToastProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

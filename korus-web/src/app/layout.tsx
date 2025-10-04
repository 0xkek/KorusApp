import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { ParticleSystem } from "@/components/ParticleSystem";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Korus - Social Gaming on Solana",
  description: "Challenge friends, play games, and win SOL on Korus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <WalletContextProvider>
          {children}
          <ParticleSystem />
        </WalletContextProvider>
      </body>
    </html>
  );
}

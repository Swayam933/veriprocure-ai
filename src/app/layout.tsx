import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriProcure AI — Verified Intelligence Procurement",
  description: "An autonomous intelligence procurement workspace powered by Telegraph."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

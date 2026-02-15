import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "IN1010 Interactive",
  description: "Interaktiv øving for IN1010 midtveisoppgaver med fasit-toggle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}

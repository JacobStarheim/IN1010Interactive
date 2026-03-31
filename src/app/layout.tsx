import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthBar } from "@/components/auth/auth-bar";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import {
  getHtmlLang,
  getSiteDescription,
  getSiteTitle,
  LOCALE_COOKIE_NAME,
  resolveLocale,
} from "@/lib/i18n";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return {
    title: getSiteTitle(),
    description: getSiteDescription(locale),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={getHtmlLang(locale)}>
      <body>
        <LocaleProvider>
          <AuthBar />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}

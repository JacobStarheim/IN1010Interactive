import type { Metadata } from "next";
import { cookies } from "next/headers";

import { HomePageContent } from "@/components/home/home-page-content";
import {
  getHomeTitle,
  getSiteDescription,
  LOCALE_COOKIE_NAME,
  resolveLocale,
} from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return {
    title: getHomeTitle(locale),
    description: getSiteDescription(locale),
  };
}

export default function HomePage() {
  return <HomePageContent />;
}

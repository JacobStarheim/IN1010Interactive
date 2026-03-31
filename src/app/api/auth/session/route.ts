import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isBlobConfigured } from "@/lib/blob-store";
import { isAuthConfigured, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const enabled = isAuthConfigured() && isBlobConfigured();
  const session = enabled ? readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value) : null;

  return NextResponse.json({
    enabled,
    authenticated: Boolean(session),
    user: session,
  });
}

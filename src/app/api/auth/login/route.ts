import { NextResponse } from "next/server";

import { isBlobConfigured, readPrivateJson } from "@/lib/blob-store";
import {
  createSessionToken,
  isAuthConfigured,
  normalizeUsername,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  userBlobPath,
  verifyPassword,
  type UserRecord,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthConfigured() || !isBlobConfigured()) {
    return NextResponse.json(
      { error: "Login er ikke konfigurert ennå. Mangler SESSION_SECRET eller Blob-token." },
      { status: 500 }
    );
  }

  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const normalizedUsername = normalizeUsername(username ?? "");
    const user = await readPrivateJson<UserRecord>(userBlobPath(normalizedUsername));
    if (!user || !verifyPassword(password ?? "", user.passwordHash)) {
      return NextResponse.json({ error: "Feil brukernavn eller passord." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: { username: user.normalizedUsername },
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ username: user.normalizedUsername }),
      sessionCookieOptions
    );
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

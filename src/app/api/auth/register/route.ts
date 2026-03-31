import { NextResponse } from "next/server";

import { isBlobConfigured, readPrivateJson, writePrivateJson } from "@/lib/blob-store";
import {
  createSessionToken,
  createUserRecord,
  isAuthConfigured,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  progressBlobPath,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  type UserRecord,
  userBlobPath,
} from "@/lib/auth";
import { createEmptyProgressSnapshot } from "@/lib/cloud-progress";

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
    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json(
        { error: "Brukernavn må være 3-24 tegn og bare bruke a-z, 0-9, _ eller -." },
        { status: 400 }
      );
    }

    if (!isValidPassword(password ?? "")) {
      return NextResponse.json(
        { error: "Passord må være minst 8 tegn." },
        { status: 400 }
      );
    }

    const existingUser = await readPrivateJson<UserRecord>(userBlobPath(normalizedUsername));
    if (existingUser) {
      return NextResponse.json({ error: "Brukernavnet er allerede tatt." }, { status: 409 });
    }

    const user = createUserRecord(username ?? normalizedUsername, password ?? "");
    await writePrivateJson(userBlobPath(normalizedUsername), user);
    await writePrivateJson(progressBlobPath(normalizedUsername), createEmptyProgressSnapshot());

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

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isBlobConfigured, readPrivateJson, writePrivateJson } from "@/lib/blob-store";
import { isAuthConfigured, progressBlobPath, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createEmptyProgressSnapshot, type ProgressSnapshot } from "@/lib/cloud-progress";

export const runtime = "nodejs";

const unauthorized = () =>
  NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });

const unavailable = () =>
  NextResponse.json(
    { error: "Sky-lagring er ikke konfigurert ennå. Mangler SESSION_SECRET eller Blob-token." },
    { status: 500 }
  );

export async function GET() {
  if (!isAuthConfigured() || !isBlobConfigured()) {
    return unavailable();
  }

  try {
    const cookieStore = await cookies();
    const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return unauthorized();
    }

    const snapshot =
      (await readPrivateJson<ProgressSnapshot>(progressBlobPath(session.username))) ??
      createEmptyProgressSnapshot();

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAuthConfigured() || !isBlobConfigured()) {
    return unavailable();
  }

  try {
    const cookieStore = await cookies();
    const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return unauthorized();
    }

    const snapshot = (await request.json()) as ProgressSnapshot;
    const normalizedSnapshot: ProgressSnapshot = {
      version: 1,
      updatedAt: snapshot.updatedAt || new Date().toISOString(),
      entries:
        snapshot.entries && typeof snapshot.entries === "object" ? snapshot.entries : {},
    };

    await writePrivateJson(progressBlobPath(session.username), normalizedSnapshot);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

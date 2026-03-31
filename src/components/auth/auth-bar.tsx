"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import styles from "@/components/auth/auth-bar.module.css";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  applyProgressSnapshot,
  CLOUD_OWNER_STORAGE_KEY,
  createEmptyProgressSnapshot,
  createLocalProgressSnapshot,
  LOCAL_PROGRESS_CHANGE_EVENT,
  mergeProgressSnapshots,
  type ProgressSnapshot,
} from "@/lib/cloud-progress";
import { getLocaleLabel } from "@/lib/i18n";

type SessionPayload = {
  enabled: boolean;
  authenticated: boolean;
  user: { username: string } | null;
};

type SyncState = "idle" | "bootstrapping" | "saving" | "saved" | "error";

const bootstrapKey = (username: string) => `in1010-cloud-bootstrapped:${username}`;

export function AuthBar() {
  const { locale, setLocale } = useLocale();
  const isEnglish = locale === "en";
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [authAction, setAuthAction] = useState<"login" | "register" | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const bootstrappedUserRef = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json()) as SessionPayload;
    setSession(payload);
    return payload;
  }, []);

  const pushSnapshot = useCallback(async (snapshot: ProgressSnapshot) => {
    const response = await fetch("/api/progress", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(
        payload?.error ??
          (isEnglish ? "Could not save progress to the cloud." : "Kunne ikke lagre skyprogresjon.")
      );
    }
  }, [isEnglish]);

  const bootstrapCloudState = useCallback(
    async (currentSession: SessionPayload) => {
      if (!currentSession.enabled || !currentSession.authenticated || !currentSession.user) {
        setSyncState("idle");
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      const storage = window.localStorage;
      const currentUsername = currentSession.user.username;
      const bootKey = bootstrapKey(currentUsername);
      if (window.sessionStorage.getItem(bootKey)) {
        bootstrappedUserRef.current = currentUsername;
        setSyncState("saved");
        return;
      }

      setSyncState("bootstrapping");
      const response = await fetch("/api/progress", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setSyncState("error");
        setMessage({
          text:
            payload?.error ??
            (isEnglish ? "Could not fetch saved progress." : "Kunne ikke hente lagret progresjon."),
          kind: "error",
        });
        return;
      }

      const remoteSnapshot = (await response.json()) as ProgressSnapshot;
      const localSnapshot = createLocalProgressSnapshot(storage);
      const localOwner = storage.getItem(CLOUD_OWNER_STORAGE_KEY);
      const remoteHasData = Object.keys(remoteSnapshot.entries ?? {}).length > 0;
      const localHasData = Object.keys(localSnapshot.entries).length > 0;
      const ownerMatches = localOwner === currentUsername;
      const ownerUnset = !localOwner;

      let nextSnapshot = remoteSnapshot;
      let shouldUpload = false;

      if (remoteHasData) {
        if (ownerMatches && localHasData) {
          nextSnapshot = mergeProgressSnapshots(remoteSnapshot, localSnapshot);
          shouldUpload = true;
        }
      } else if (localHasData && (ownerMatches || ownerUnset)) {
        nextSnapshot = localSnapshot;
        shouldUpload = true;
      } else {
        nextSnapshot = createEmptyProgressSnapshot();
      }

      const changed = applyProgressSnapshot(storage, nextSnapshot);
      storage.setItem(CLOUD_OWNER_STORAGE_KEY, currentUsername);
      window.sessionStorage.setItem(bootKey, "1");
      bootstrappedUserRef.current = currentUsername;

      if (shouldUpload) {
        await pushSnapshot({
          ...nextSnapshot,
          updatedAt: new Date().toISOString(),
        });
      }

      setSyncState("saved");
      if (changed) {
        window.location.reload();
      }
    },
    [isEnglish, pushSnapshot]
  );

  useEffect(() => {
    refreshSession().catch(() => {
      setSession({ enabled: false, authenticated: false, user: null });
      setMessage({
        text: isEnglish ? "Could not reach login status." : "Kunne ikke koble til login-status.",
        kind: "error",
      });
    });
  }, [isEnglish, refreshSession]);

  useEffect(() => {
    if (!session || !session.enabled) {
      return;
    }

    bootstrapCloudState(session).catch((error) => {
      setSyncState("error");
      setMessage({
        text: error instanceof Error ? error.message : isEnglish ? "Cloud sync failed." : "Sky-synk feilet.",
        kind: "error",
      });
    });
  }, [bootstrapCloudState, isEnglish, session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageProto = window.Storage.prototype;
    const originalSetItem = storageProto.setItem;
    const originalRemoveItem = storageProto.removeItem;
    const originalClear = storageProto.clear;

    const notify = (key?: string | null) => {
      if (!key || (key.startsWith("in1010:") && key !== CLOUD_OWNER_STORAGE_KEY)) {
        window.dispatchEvent(new CustomEvent(LOCAL_PROGRESS_CHANGE_EVENT, { detail: { key } }));
      }
    };

    storageProto.setItem = function patchedSetItem(key: string, value: string) {
      originalSetItem.call(this, key, value);
      notify(key);
    };

    storageProto.removeItem = function patchedRemoveItem(key: string) {
      originalRemoveItem.call(this, key);
      notify(key);
    };

    storageProto.clear = function patchedClear() {
      originalClear.call(this);
      notify(null);
    };

    return () => {
      storageProto.setItem = originalSetItem;
      storageProto.removeItem = originalRemoveItem;
      storageProto.clear = originalClear;
    };
  }, []);

  useEffect(() => {
    if (!session?.authenticated || !session.user) {
      return;
    }

    const handleLocalChange = () => {
      if (bootstrappedUserRef.current !== session.user?.username) {
        return;
      }

      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = window.setTimeout(async () => {
        try {
          setSyncState("saving");
          await pushSnapshot(createLocalProgressSnapshot(window.localStorage));
          setSyncState("saved");
        } catch (error) {
          setSyncState("error");
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : isEnglish
                ? "Cloud save failed."
                : "Sky-lagring feilet.",
            kind: "error",
          });
        }
      }, 500);
    };

    window.addEventListener(LOCAL_PROGRESS_CHANGE_EVENT, handleLocalChange);
    return () => {
      window.removeEventListener(LOCAL_PROGRESS_CHANGE_EVENT, handleLocalChange);
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isEnglish, pushSnapshot, session]);

  const handleAuthSubmit = useCallback(
    async (mode: "login" | "register") => {
      setMessage(null);
      setSyncState("idle");
      setAuthAction(mode);

      try {
        const response = await fetch(`/api/auth/${mode}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; user?: { username: string } }
          | null;

        if (!response.ok) {
          setMessage({
            text: payload?.error ?? (isEnglish ? "Authentication failed." : "Innlogging feilet."),
            kind: "error",
          });
          return;
        }

        const nextSession = await refreshSession();
        setUsername(nextSession.user?.username ?? username.trim().toLowerCase());
        setMessage({
          text:
            mode === "register"
              ? isEnglish
                ? "Account created. Your results are now saved to your user."
                : "Konto opprettet. Resultatene dine lagres nå på brukeren."
              : isEnglish
              ? "Logged in. Cloud sync is active."
              : "Innlogget. Sky-lagring er aktiv.",
          kind: "success",
        });
        await bootstrapCloudState(nextSession);
        setPassword("");
      } finally {
        setAuthAction(null);
      }
    },
    [bootstrapCloudState, isEnglish, password, refreshSession, username]
  );

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleAuthSubmit("login");
  };

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (session?.user && typeof window !== "undefined") {
      window.sessionStorage.removeItem(bootstrapKey(session.user.username));
    }

    bootstrappedUserRef.current = null;
    setSyncState("idle");
    setPassword("");
    setMessage({
      text: isEnglish
        ? "Logged out. Local data is still kept on this device."
        : "Logget ut. Lokale data er fortsatt på denne enheten.",
      kind: "success",
    });
    setSession({ enabled: session?.enabled ?? true, authenticated: false, user: null });
  }, [isEnglish, session]);

  const statusPillClass = useMemo(() => {
    if (syncState === "error") return `${styles.pill} ${styles.pillBad}`;
    if (syncState === "saving" || syncState === "bootstrapping") {
      return `${styles.pill} ${styles.pillWarn}`;
    }
    return `${styles.pill} ${styles.pillGood}`;
  }, [syncState]);

  const statusText =
    syncState === "bootstrapping"
      ? isEnglish
        ? "Fetching cloud data"
        : "Henter skydata"
      : syncState === "saving"
        ? isEnglish
          ? "Saving to cloud"
          : "Lagrer i skyen"
        : syncState === "error"
          ? isEnglish
            ? "Cloud sync failed"
            : "Sky-synk feilet"
          : isEnglish
            ? "Cloud sync active"
            : "Sky-lagring aktiv";

  return (
    <div className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.row}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{isEnglish ? "User account" : "Brukerkonto"}</p>
            <p className={styles.title}>
              {isEnglish
                ? "Sign in to save progress on your user"
                : "Logg inn for å lagre progresjon på brukeren din"}
            </p>
            <p className={styles.meta}>
              {isEnglish
                ? "Results, notes, timer, and answers are synced to the cloud while you are signed in."
                : "Resultater, notater, timer og oppgavesvar synkes til skyen når du er innlogget."}
            </p>
          </div>

          <div className={styles.statusBlock}>
            <div className={styles.languageRow}>
              <span className={styles.languageLabel}>{isEnglish ? "Language" : "Språk"}</span>
              <div className={styles.languageButtons}>
                {(["nb", "en"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.localeButton} ${locale === value ? styles.localeButtonActive : ""}`}
                    onClick={() => setLocale(value)}
                  >
                    {getLocaleLabel(locale, value)}
                  </button>
                ))}
              </div>
            </div>

            {session === null ? (
              <span className={styles.pill}>{isEnglish ? "Checking login..." : "Sjekker login..."}</span>
            ) : session.enabled ? (
              <div className={styles.statusRow}>
                {session.authenticated && session.user ? (
                  <>
                    <span className={`${styles.pill} ${styles.pillGood}`}>
                      {isEnglish ? "Signed in as" : "Logget inn som"} {session.user.username}
                    </span>
                    <span className={statusPillClass}>{statusText}</span>
                    <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
                      {isEnglish ? "Log out" : "Logg ut"}
                    </button>
                  </>
                ) : (
                  <span className={styles.pill}>{isEnglish ? "Not signed in" : "Ikke logget inn"}</span>
                )}
              </div>
            ) : (
              <span className={`${styles.pill} ${styles.pillWarn}`}>
                {isEnglish ? "Cloud login is not configured yet" : "Sky-login ikke konfigurert ennå"}
              </span>
            )}
          </div>
        </div>

        {session?.enabled && !session.authenticated ? (
          <form className={styles.form} onSubmit={handleLoginSubmit}>
            <label className={styles.field}>
              <span>{isEnglish ? "Username" : "Brukernavn"}</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={isEnglish ? "for example jacob" : "f.eks. jacob"}
                autoComplete="username"
              />
            </label>
            <label className={styles.field}>
              <span>{isEnglish ? "Password" : "Passord"}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isEnglish ? "At least 8 characters" : "Minst 8 tegn"}
                autoComplete="current-password"
              />
            </label>
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={authAction !== null}>
                {authAction === "login"
                  ? isEnglish
                    ? "Signing in..."
                    : "Logger inn..."
                  : isEnglish
                  ? "Log in"
                  : "Logg inn"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void handleAuthSubmit("register")}
                disabled={authAction !== null}
              >
                {authAction === "register"
                  ? isEnglish
                    ? "Creating..."
                    : "Oppretter..."
                  : isEnglish
                  ? "Create account"
                  : "Opprett konto"}
              </button>
            </div>
          </form>
        ) : null}

        {message ? (
          <p
            className={`${styles.message} ${
              message.kind === "error" ? styles.messageError : styles.messageSuccess
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}

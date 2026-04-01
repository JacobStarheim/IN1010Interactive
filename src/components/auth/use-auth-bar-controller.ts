"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyProgressSnapshot,
  CLOUD_OWNER_STORAGE_KEY,
  createEmptyProgressSnapshot,
  createLocalProgressSnapshot,
  LOCAL_PROGRESS_CHANGE_EVENT,
  mergeProgressSnapshots,
  type ProgressSnapshot,
} from "@/lib/cloud-progress";

export type SessionPayload = {
  enabled: boolean;
  authenticated: boolean;
  user: { username: string } | null;
};

export type SyncState = "idle" | "bootstrapping" | "saving" | "saved" | "error";

export type AuthMessage = {
  text: string;
  kind: "error" | "success";
} | null;

const bootstrapKey = (username: string) => `in1010-cloud-bootstrapped:${username}`;

export function useAuthBarController(isEnglish: boolean) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [authAction, setAuthAction] = useState<"login" | "register" | null>(null);
  const [message, setMessage] = useState<AuthMessage>(null);
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

  const pushSnapshot = useCallback(
    async (snapshot: ProgressSnapshot) => {
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
            (isEnglish
              ? "Could not save progress to the cloud."
              : "Kunne ikke lagre skyprogresjon.")
        );
      }
    },
    [isEnglish]
  );

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
            (isEnglish
              ? "Could not fetch saved progress."
              : "Kunne ikke hente lagret progresjon."),
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
        text: isEnglish
          ? "Could not reach login status."
          : "Kunne ikke koble til login-status.",
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
        text:
          error instanceof Error
            ? error.message
            : isEnglish
              ? "Cloud sync failed."
              : "Sky-synk feilet.",
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

  const authenticate = useCallback(
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
            text:
              payload?.error ??
              (isEnglish ? "Authentication failed." : "Innlogging feilet."),
            kind: "error",
          });
          return;
        }

        const nextSession = await refreshSession();
        const normalizedUsername = nextSession.user?.username ?? username.trim().toLowerCase();
        const localSnapshot =
          typeof window === "undefined"
            ? createEmptyProgressSnapshot()
            : createLocalProgressSnapshot(window.localStorage);
        const hasLocalData = Object.keys(localSnapshot.entries).length > 0;

        setUsername(normalizedUsername);

        if (mode === "register" && hasLocalData) {
          await pushSnapshot({
            ...localSnapshot,
            updatedAt: new Date().toISOString(),
          });
        }

        await bootstrapCloudState(nextSession);
        setMessage({
          text:
            mode === "register"
              ? hasLocalData
                ? isEnglish
                  ? "Account created. Your existing local progress was copied to this user."
                  : "Konto opprettet. Den lokale progresjonen din ble kopiert til denne brukeren."
                : isEnglish
                  ? "Account created. New progress will now be saved to this user."
                  : "Konto opprettet. Ny progresjon lagres nå på denne brukeren."
              : isEnglish
                ? "Logged in. Cloud sync is active."
                : "Innlogget. Sky-lagring er aktiv.",
          kind: "success",
        });
        setPassword("");
      } catch (error) {
        setMessage({
          text:
            error instanceof Error
              ? error.message
              : isEnglish
                ? "Authentication failed."
                : "Innlogging feilet.",
          kind: "error",
        });
      } finally {
        setAuthAction(null);
      }
    },
    [bootstrapCloudState, isEnglish, password, pushSnapshot, refreshSession, username]
  );

  const login = useCallback(async () => {
    await authenticate("login");
  }, [authenticate]);

  const register = useCallback(async () => {
    await authenticate("register");
  }, [authenticate]);

  const logout = useCallback(async () => {
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

  return {
    session,
    username,
    setUsername,
    password,
    setPassword,
    syncState,
    authAction,
    message,
    login,
    register,
    logout,
  };
}

"use client";

import { useMemo, type FormEvent } from "react";

import styles from "@/components/auth/auth-bar.module.css";
import {
  useAuthBarController,
} from "@/components/auth/use-auth-bar-controller";
import { useLocale } from "@/components/i18n/locale-provider";
import { getLocaleLabel } from "@/lib/i18n";

export function AuthBar() {
  const { locale, setLocale } = useLocale();
  const isEnglish = locale === "en";
  const {
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
  } = useAuthBarController(isEnglish);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void login();
  };

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
              session.authenticated && session.user ? (
                <div className={styles.statusRow}>
                  <span className={`${styles.pill} ${styles.pillGood}`}>
                    {isEnglish ? "Signed in as" : "Logget inn som"} {session.user.username}
                  </span>
                  <span className={statusPillClass}>{statusText}</span>
                  <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
                    {isEnglish ? "Log out" : "Logg ut"}
                  </button>
                </div>
              ) : (
                <span className={styles.pill}>{isEnglish ? "Not signed in" : "Ikke logget inn"}</span>
              )
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
                onClick={() => void register()}
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

import "server-only";

import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "in1010_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  username: string;
};

export type UserRecord = {
  id: string;
  username: string;
  normalizedUsername: string;
  passwordHash: string;
  createdAt: string;
};

type SessionPayload = {
  username: string;
  exp: number;
};

const requireSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
};

export const isAuthConfigured = () => Boolean(process.env.SESSION_SECRET);

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) => /^[a-z0-9_-]{3,24}$/.test(value);

export const isValidPassword = (value: string) => value.length >= 8 && value.length <= 128;

export const userBlobPath = (normalizedUsername: string) => `users/${normalizedUsername}.json`;

export const progressBlobPath = (normalizedUsername: string) =>
  `progress/${normalizedUsername}.json`;

const base64UrlEncode = (value: string) => Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signValue = (value: string) =>
  createHmac("sha256", requireSessionSecret()).update(value).digest("base64url");

export const hashPassword = (password: string, salt = randomBytes(16).toString("hex")) => {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, passwordHash: string) => {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(computedHash, "hex"));
};

export const createUserRecord = (username: string, password: string): UserRecord => {
  const normalizedUsername = normalizeUsername(username);
  return {
    id: randomUUID(),
    username: username.trim(),
    normalizedUsername,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
};

export const createSessionToken = (user: SessionUser) => {
  const payload: SessionPayload = {
    username: normalizeUsername(user.username),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const readSessionToken = (token: string | undefined | null): SessionUser | null => {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload.username || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return { username: payload.username };
  } catch {
    return null;
  }
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

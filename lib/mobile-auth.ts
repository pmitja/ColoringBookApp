import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { headers } from "next/headers";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 60 * 15; // 15m
const MOBILE_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d
const MOBILE_REFRESH_PREFIX = "mobile_refresh.";
const MOBILE_ACCESS_TOKEN_TYPE = "mobile_access" as const;

type MobileAccessTokenClaims = {
  sub: string;
  type: typeof MOBILE_ACCESS_TOKEN_TYPE;
  iat: number;
  exp: number;
  role?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

type GoogleTokenInfo = {
  aud?: string;
  azp?: string;
  iss?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
};

type MobileAuthUser = {
  id: string;
  role: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type MobileSessionResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  usage: {
    planTitle: string;
    monthlyGenerationLimit: number;
    generationsUsed: number;
    generationsRemaining: number;
  };
};

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function getAccessTokenSigningSecret() {
  return `${env.AUTH_SECRET}:mobile-access`;
}

function signMobileAccessToken(claims: Omit<MobileAccessTokenClaims, "iat" | "exp" | "type">) {
  const now = Math.floor(Date.now() / 1000);
  const payload: MobileAccessTokenClaims = {
    ...claims,
    type: MOBILE_ACCESS_TOKEN_TYPE,
    iat: now,
    exp: now + MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", getAccessTokenSigningSecret())
    .update(signingInput)
    .digest();

  return {
    token: `${signingInput}.${base64UrlEncode(signature)}`,
    expiresAt: payload.exp * 1000,
  };
}

function verifyMobileAccessToken(token: string): MobileAccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const expectedSig = createHmac("sha256", getAccessTokenSigningSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(encodedSignature);
  } catch {
    return null;
  }

  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as MobileAccessTokenClaims;
    const now = Math.floor(Date.now() / 1000);
    if (payload.type !== MOBILE_ACCESS_TOKEN_TYPE) return null;
    if (!payload.sub) return null;
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function refreshSessionTokenValue(token: string) {
  return `${MOBILE_REFRESH_PREFIX}${hashRefreshToken(token)}`;
}

function createRefreshToken() {
  return base64UrlEncode(randomBytes(48));
}

function getAllowedGoogleAudiences() {
  return Array.from(
    new Set(
      [
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_IOS_CLIENT_ID,
        env.GOOGLE_ANDROID_CLIENT_ID,
        env.GOOGLE_EXPO_CLIENT_ID,
      ].filter((value): value is string => Boolean(value && value.trim())),
    ),
  );
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" },
  );

  const data = (await response.json().catch(() => ({}))) as GoogleTokenInfo & {
    error_description?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to verify Google token");
  }

  const allowedAudiences = getAllowedGoogleAudiences();
  if (!data.aud || !allowedAudiences.includes(data.aud)) {
    throw new Error("Google token audience is not allowed for this app");
  }

  if (!data.sub) {
    throw new Error("Google token missing subject");
  }

  const issuer = data.iss;
  if (issuer && issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") {
    throw new Error("Invalid Google token issuer");
  }

  const exp = Number(data.exp ?? 0);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) {
    throw new Error("Google token expired");
  }

  return data;
}

async function exchangeGoogleCodeForIdToken(input: {
  code: string;
  codeVerifier?: string;
  redirectUri: string;
  platform?: string;
}) {
  const platform = (input.platform ?? "").toLowerCase();
  const clientId =
    platform === "ios"
      ? env.GOOGLE_IOS_CLIENT_ID || env.GOOGLE_CLIENT_ID
      : platform === "android"
        ? env.GOOGLE_ANDROID_CLIENT_ID || env.GOOGLE_CLIENT_ID
        : platform === "expo"
          ? env.GOOGLE_EXPO_CLIENT_ID || env.GOOGLE_CLIENT_ID
          : env.GOOGLE_CLIENT_ID;

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });

  if (input.codeVerifier) {
    body.set("code_verifier", input.codeVerifier);
  }

  // Google web clients require the client secret; installed app clients do not.
  if (clientId === env.GOOGLE_CLIENT_ID) {
    body.set("client_secret", env.GOOGLE_CLIENT_SECRET);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    id_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.id_token) {
    throw new Error(data.error_description || data.error || "Google code exchange failed");
  }

  return { idToken: data.id_token, googleAccessToken: data.access_token };
}

async function upsertUserFromGoogleIdentity(identity: GoogleTokenInfo) {
  const providerAccountId = identity.sub as string;
  const email = identity.email?.toLowerCase() ?? null;
  const emailVerified =
    identity.email_verified === true || identity.email_verified === "true";

  const result = await prisma.$transaction(async (tx) => {
    const existingAccount = await tx.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount?.user) {
      const updatedUser = await tx.user.update({
        where: { id: existingAccount.user.id },
        data: {
          name: identity.name ?? existingAccount.user.name,
          image: identity.picture ?? existingAccount.user.image,
          email: email ?? existingAccount.user.email,
          emailVerified:
            emailVerified && !existingAccount.user.emailVerified
              ? new Date()
              : existingAccount.user.emailVerified,
        },
      });
      return updatedUser;
    }

    let user = email
      ? await tx.user.findUnique({ where: { email } })
      : null;

    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          name: identity.name ?? null,
          image: identity.picture ?? null,
          emailVerified: emailVerified ? new Date() : null,
        },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: identity.name ?? user.name,
          image: identity.picture ?? user.image,
          emailVerified: emailVerified && !user.emailVerified ? new Date() : user.emailVerified,
        },
      });
    }

    await tx.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId,
        },
      },
      update: {
        userId: user.id,
        type: "oauth",
      },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "google",
        providerAccountId,
      },
    });

    return user;
  });

  return result;
}

async function buildUsageSummary(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!dbUser) {
    throw new Error("User not found");
  }

  const plan = resolveGenerationPlanLimit(dbUser);
  const generationsUsed = await getUserMonthlyGenerationUsage(
    userId,
    getCurrentMonthStartUtc(),
  );

  return {
    planTitle: plan.planTitle,
    monthlyGenerationLimit: plan.monthlyGenerationLimit,
    generationsUsed,
    generationsRemaining: Math.max(plan.monthlyGenerationLimit - generationsUsed, 0),
  };
}

async function issueRefreshTokenForUser(userId: string) {
  const refreshToken = createRefreshToken();
  const sessionToken = refreshSessionTokenValue(refreshToken);
  const expires = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return refreshToken;
}

async function rotateRefreshToken(oldRefreshToken: string) {
  const oldSessionToken = refreshSessionTokenValue(oldRefreshToken);
  const existing = await prisma.session.findUnique({
    where: { sessionToken: oldSessionToken },
    include: { user: true },
  });

  if (!existing || existing.expires.getTime() <= Date.now()) {
    if (existing) {
      await prisma.session.delete({ where: { id: existing.id } }).catch(() => undefined);
    }
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const nextSessionToken = refreshSessionTokenValue(nextRefreshToken);
  const nextExpires = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_SECONDS * 1000);

  const updated = await prisma.session.update({
    where: { id: existing.id },
    data: {
      sessionToken: nextSessionToken,
      expires: nextExpires,
    },
    include: { user: true },
  });

  return {
    user: updated.user,
    refreshToken: nextRefreshToken,
  };
}

export async function revokeRefreshToken(refreshToken?: string | null) {
  if (!refreshToken) return;
  const sessionToken = refreshSessionTokenValue(refreshToken);
  await prisma.session.deleteMany({ where: { sessionToken } });
}

export async function createMobileSessionFromGoogle(input: {
  idToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  platform?: string;
}) {
  let idToken = input.idToken;

  if (!idToken && input.code && input.redirectUri) {
    const exchanged = await exchangeGoogleCodeForIdToken({
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri,
      platform: input.platform,
    });
    idToken = exchanged.idToken;
  }

  if (!idToken) {
    throw new Error("Missing Google idToken or authorization code");
  }

  const identity = await verifyGoogleIdToken(idToken);
  const user = await upsertUserFromGoogleIdentity(identity);
  const refreshToken = await issueRefreshTokenForUser(user.id);
  const access = signMobileAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    image: user.image,
  });
  const usage = await buildUsageSummary(user.id);

  const response: MobileSessionResponse = {
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    tokens: {
      accessToken: access.token,
      refreshToken,
      expiresAt: access.expiresAt,
    },
    usage,
  };

  return response;
}

export async function refreshMobileSession(refreshToken: string) {
  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    return null;
  }

  const access = signMobileAccessToken({
    sub: rotated.user.id,
    role: rotated.user.role,
    email: rotated.user.email,
    name: rotated.user.name,
    image: rotated.user.image,
  });
  const usage = await buildUsageSummary(rotated.user.id);

  return {
    user: {
      id: rotated.user.id,
      role: rotated.user.role,
      email: rotated.user.email,
      name: rotated.user.name,
      image: rotated.user.image,
    },
    tokens: {
      accessToken: access.token,
      refreshToken: rotated.refreshToken,
      expiresAt: access.expiresAt,
    },
    usage,
  } satisfies MobileSessionResponse;
}

function getBearerTokenFromHeaders(headersLike: Pick<Headers, "get"> | null | undefined) {
  const header = headersLike?.get("authorization") ?? headersLike?.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

export async function getMobileUserFromBearerHeaders(
  headersLike: Pick<Headers, "get"> | null | undefined,
): Promise<MobileAuthUser | null> {
  const token = getBearerTokenFromHeaders(headersLike);
  if (!token) return null;

  const claims = verifyMobileAccessToken(token);
  if (!claims?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      image: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export async function getMobileUserFromCurrentRequestHeaders() {
  return getMobileUserFromBearerHeaders(headers());
}

export async function getMobileSessionMe(headersLike: Pick<Headers, "get"> | null | undefined) {
  const user = await getMobileUserFromBearerHeaders(headersLike);
  if (!user) return null;
  const usage = await buildUsageSummary(user.id);
  return { user, usage };
}

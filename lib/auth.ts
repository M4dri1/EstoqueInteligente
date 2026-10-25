import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { userRepository } from "./repositories/user-repository";

export const COOKIE_NAME = "kassius_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type RoleCode = "ADMIN" | "STAFF";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: RoleCode;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "STAFF")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const getActiveUser = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const user = await userRepository.findById(session.userId);
  if (!user || !user.active) {
    return null;
  }
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
});

export async function authenticate(email: string, password: string) {
  const user = await userRepository.findByEmail(email);
  if (!user || !user.active) {
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } satisfies SessionPayload;
}

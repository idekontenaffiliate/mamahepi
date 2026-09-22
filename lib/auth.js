import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "mamahepi_admin_session";
const ALG = "HS256";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diset di .env");
  }
  return new TextEncoder().encode(secret);
}

// payload: { email, role: "administrator" | "admin", name, id? }
export async function createSessionToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

// "Administrator" = pemilik toko, login pakai ADMIN_EMAIL/ADMIN_PASSWORD di .env.
// Beda dari akun "admin" biasa yang mendaftar sendiri lewat /admin/register.
export function checkAdministratorCredentials(email, password) {
  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validEmail || !validPassword) return false;
  return email === validEmail && password === validPassword;
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  if (!hash) return false;
  return await bcrypt.compare(password, hash);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

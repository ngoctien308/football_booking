import crypto from "crypto";

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

const hmac = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("base64");

const signatureFor = (secret, payloadB64) =>
  hmac(secret, payloadB64).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export function createAdminToken({ email, secret, ttlSeconds = 60 * 60 * 24 * 7 }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ email, iat: now, exp: now + ttlSeconds });
  const payloadB64 = base64UrlEncode(payload);
  const sig = signatureFor(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token, secret) {
  if (!token || typeof token !== "string") return { ok: false, error: "MISSING_TOKEN" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "INVALID_TOKEN" };
  const [payloadB64, sig] = parts;
  const expected = signatureFor(secret, payloadB64);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, error: "BAD_SIGNATURE" };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now > payload.exp) return { ok: false, error: "EXPIRED" };
  if (!payload?.email) return { ok: false, error: "INVALID_PAYLOAD" };

  return { ok: true, payload };
}


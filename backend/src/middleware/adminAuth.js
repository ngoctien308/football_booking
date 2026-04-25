import { verifyAdminToken } from "../utils/adminToken.js";

export function requireAdminToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const secret = process.env.ADMIN_AUTH_SECRET || "dev-admin-secret-change-me";

  const result = verifyAdminToken(token, secret);
  if (!result.ok) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.admin = { email: result.payload.email };
  next();
}


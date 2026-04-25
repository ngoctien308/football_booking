import { db } from "../config/db.js";
import { createAdminToken } from "../utils/adminToken.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const e = typeof email === "string" ? email.trim() : "";
    const p = typeof password === "string" ? password : "";

    if (!e || !p) return res.status(400).json({ message: "Missing email or password" });
    if (e !== ADMIN_EMAIL || p !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const secret = process.env.ADMIN_AUTH_SECRET || "dev-admin-secret-change-me";
    const token = createAdminToken({ email: e, secret });
    return res.status(200).json({ token, admin: { email: e } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while logging in", error: error.message });
  }
};

export const adminMe = async (req, res) => {
  return res.status(200).json({ admin: req.admin || null });
};

export const listAccounts = async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role.trim() : "";

    let query = db
      .from("users")
      .select("id, clerk_user_id, name, email, role, owner_approved, is_locked, deleted_at, created_at")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
    if (q) {
      const qq = q.toLowerCase();
      rows = rows.filter((u) => {
        const hay = `${u.name || ""} ${u.email || ""} ${u.clerk_user_id || ""}`.toLowerCase();
        return hay.includes(qq);
      });
    }

    return res.status(200).json({ accounts: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while listing accounts", error: error.message });
  }
};

export const approveOwner = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { approved } = req.body || {};

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "Missing or invalid id" });
    }

    const nextApproved = approved === false ? false : true;

    const { data: user, error: userError } = await db
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "owner") return res.status(409).json({ message: "User is not an owner" });

    const { data: updated, error: updateError } = await db
      .from("users")
      .update({ owner_approved: nextApproved })
      .eq("id", userId)
      .select("id, owner_approved")
      .maybeSingle();
    if (updateError) throw updateError;

    return res.status(200).json({ message: "Owner approval updated", user: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while approving owner", error: error.message });
  }
};

export const setAccountLock = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { locked } = req.body || {};

    if (!Number.isFinite(userId)) return res.status(400).json({ message: "Missing or invalid id" });

    const nextLocked = locked === true;

    const { data: updated, error: updateError } = await db
      .from("users")
      .update({ is_locked: nextLocked })
      .eq("id", userId)
      .select("id, is_locked")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "Account lock updated", user: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while locking account", error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const hard = String(req.query.hard || "").toLowerCase() === "true";

    if (!Number.isFinite(userId)) return res.status(400).json({ message: "Missing or invalid id" });

    if (hard) {
      const { error } = await db.from("users").delete().eq("id", userId);
      if (error) throw error;
      return res.status(200).json({ message: "Account deleted permanently" });
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await db
      .from("users")
      .update({ deleted_at: now })
      .eq("id", userId)
      .select("id, deleted_at")
      .maybeSingle();
    if (error) throw error;
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "Account deleted", user: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while deleting account", error: error.message });
  }
};

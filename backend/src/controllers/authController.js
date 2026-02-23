import { db } from "../config/db.js";

export const createUser = async (req, res) => {
    try {
        const { clerk_user_id, name, email, role } = req.body || {};

        if (!clerk_user_id || !role) {
            return res.status(400).json({ message: "Missing clerk_user_id or role." });
        }

        if (!["customer", "owner"].includes(role)) {
            return res.status(400).json({ message: "Role must be customer or owner." });
        }

        const { data: existing, error: existingError } = await db
            .from("users")
            .select("id, role")
            .eq("clerk_user_id", clerk_user_id)
            .limit(1);

        if (existingError) {
            throw existingError;
        }

        if (existing && existing.length > 0) {
            return res.status(200).json({ message: "Account already exists.", currentUser: existing[0] });
        }

        const { data: inserted, error: insertError } = await db
            .from("users")
            .insert([
                {
                    clerk_user_id,
                    name: name || null,
                    email: email || null,
                    role,
                },
            ])
            .select("*")
            .single();

        if (insertError) {
            throw insertError;
        }

        return res.status(201).json({ message: "Sign up successful.", currentUser: inserted });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;

        const { data: user, error } = await db
            .from("users")
            .select("*")
            .eq("clerk_user_id", clerk_user_id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ currentUser: user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

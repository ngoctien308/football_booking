import { db } from "../config/db.js";

async function getUserByClerkId(clerkUserId) {
    const { data, error } = await db
        .from("users")
        .select("id, role, name, email")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return { error: "NOT_FOUND" };
    return data;
}

async function getOwnerUserIdByFieldId(fieldId) {
    const { data: field, error: fieldError } = await db
        .from("fields")
        .select("id, owner_id")
        .eq("id", fieldId)
        .maybeSingle();
    if (fieldError) throw fieldError;
    if (!field) return { error: "FIELD_NOT_FOUND" };

    const { data: owner, error: ownerError } = await db
        .from("owners")
        .select("id, user_id")
        .eq("id", field.owner_id)
        .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner) return { error: "OWNER_NOT_FOUND" };

    return { owner_user_id: owner.user_id, owner_id: owner.id };
}

async function getConversationById(conversationId) {
    const { data, error } = await db
        .from("conversations")
        .select("id, field_id, customer_id, owner_user_id, last_message, last_message_at, created_at, updated_at")
        .eq("id", conversationId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function canAccessConversation(user, conversation) {
    if (!user || !conversation) return false;
    return user.id === conversation.customer_id || user.id === conversation.owner_user_id;
}

export const getOrCreateConversationByField = async (req, res) => {
    try {
        const { clerk_user_id, field_id } = req.body || {};
        const fieldId = Number(field_id);

        if (!clerk_user_id || !Number.isFinite(fieldId)) {
            return res.status(400).json({ message: "Missing clerk_user_id or invalid field_id" });
        }

        const user = await getUserByClerkId(clerk_user_id);
        if (user.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (user.role !== "customer") return res.status(403).json({ message: "Only customers can start a conversation" });

        const ownerInfo = await getOwnerUserIdByFieldId(fieldId);
        if (ownerInfo.error === "FIELD_NOT_FOUND") return res.status(404).json({ message: "Field not found" });
        if (ownerInfo.error === "OWNER_NOT_FOUND") return res.status(404).json({ message: "Owner not found" });

        const ownerUserId = ownerInfo.owner_user_id;

        const { data: existing, error: existingError } = await db
            .from("conversations")
            .select("id, field_id, customer_id, owner_user_id, last_message, last_message_at, created_at, updated_at")
            .eq("field_id", fieldId)
            .eq("customer_id", user.id)
            .eq("owner_user_id", ownerUserId)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing) return res.status(200).json({ conversation: existing });

        const { data: inserted, error: insertError } = await db
            .from("conversations")
            .insert([
                {
                    field_id: fieldId,
                    customer_id: user.id,
                    owner_user_id: ownerUserId,
                    last_message: null,
                    last_message_at: null,
                },
            ])
            .select("id, field_id, customer_id, owner_user_id, last_message, last_message_at, created_at, updated_at")
            .maybeSingle();
        if (insertError) throw insertError;

        return res.status(201).json({ conversation: inserted });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while creating conversation", error: error.message });
    }
};

export const listConversationsForCustomer = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;
        const user = await getUserByClerkId(clerk_user_id);
        if (user.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (user.role !== "customer") return res.status(403).json({ message: "Only customers can access this endpoint" });

        const { data: conversations, error } = await db
            .from("conversations")
            .select("id, field_id, customer_id, owner_user_id, last_message, last_message_at, created_at, updated_at")
            .eq("customer_id", user.id)
            .order("updated_at", { ascending: false });
        if (error) throw error;

        const fieldIds = [...new Set((conversations || []).map((c) => c.field_id))];
        let fieldMap = new Map();
        if (fieldIds.length > 0) {
            const { data: fields, error: fieldError } = await db.from("fields").select("id, field_name, address").in("id", fieldIds);
            if (fieldError) throw fieldError;
            fieldMap = new Map((fields || []).map((f) => [f.id, f]));
        }

        const rows = (conversations || []).map((c) => ({ ...c, field: fieldMap.get(c.field_id) || null }));
        return res.status(200).json({ conversations: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading conversations", error: error.message });
    }
};

export const listConversationsForOwner = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;
        const user = await getUserByClerkId(clerk_user_id);
        if (user.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (user.role !== "owner") return res.status(403).json({ message: "Only owners can access this endpoint" });

        const { data: conversations, error } = await db
            .from("conversations")
            .select("id, field_id, customer_id, owner_user_id, last_message, last_message_at, created_at, updated_at")
            .eq("owner_user_id", user.id)
            .order("updated_at", { ascending: false });
        if (error) throw error;

        const fieldIds = [...new Set((conversations || []).map((c) => c.field_id))];
        const customerIds = [...new Set((conversations || []).map((c) => c.customer_id))];

        const [fieldsResult, customersResult] = await Promise.all([
            fieldIds.length > 0
                ? db.from("fields").select("id, field_name, address").in("id", fieldIds)
                : Promise.resolve({ data: [], error: null }),
            customerIds.length > 0
                ? db.from("users").select("id, name, email").in("id", customerIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (fieldsResult.error) throw fieldsResult.error;
        if (customersResult.error) throw customersResult.error;

        const fieldMap = new Map((fieldsResult.data || []).map((f) => [f.id, f]));
        const customerMap = new Map((customersResult.data || []).map((u) => [u.id, u]));

        const rows = (conversations || []).map((c) => ({
            ...c,
            field: fieldMap.get(c.field_id) || null,
            customer: customerMap.get(c.customer_id) || null,
        }));

        return res.status(200).json({ conversations: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading conversations", error: error.message });
    }
};

export const listMessages = async (req, res) => {
    try {
        const conversationId = Number(req.params.conversation_id);
        const clerkUserId = req.query.clerk_user_id;

        if (!Number.isFinite(conversationId) || !clerkUserId) {
            return res.status(400).json({ message: "Missing conversation_id or clerk_user_id" });
        }

        const user = await getUserByClerkId(clerkUserId);
        if (user.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });

        const conversation = await getConversationById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        if (!canAccessConversation(user, conversation)) return res.status(403).json({ message: "You cannot access this conversation" });

        const { data: messages, error } = await db
            .from("messages")
            .select("id, conversation_id, sender_user_id, sender_role, content, read_at, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
        if (error) throw error;

        return res.status(200).json({ conversation, messages: messages || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading messages", error: error.message });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const conversationId = Number(req.params.conversation_id);
        const { clerk_user_id, content } = req.body || {};

        if (!Number.isFinite(conversationId) || !clerk_user_id || !content || String(content).trim().length === 0) {
            return res.status(400).json({ message: "Missing conversation_id, clerk_user_id, or content" });
        }

        const user = await getUserByClerkId(clerk_user_id);
        if (user.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });

        const conversation = await getConversationById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        if (!canAccessConversation(user, conversation)) return res.status(403).json({ message: "You cannot access this conversation" });

        const cleaned = String(content).trim().slice(0, 2000);
        const { data: inserted, error: insertError } = await db
            .from("messages")
            .insert([
                {
                    conversation_id: conversationId,
                    sender_user_id: user.id,
                    sender_role: user.role,
                    content: cleaned,
                },
            ])
            .select("id, conversation_id, sender_user_id, sender_role, content, read_at, created_at")
            .maybeSingle();
        if (insertError) throw insertError;

        const now = new Date().toISOString();
        const { error: convUpdateError } = await db
            .from("conversations")
            .update({
                last_message: cleaned,
                last_message_at: now,
                updated_at: now,
            })
            .eq("id", conversationId);
        if (convUpdateError) throw convUpdateError;

        return res.status(201).json({ message: inserted });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while sending message", error: error.message });
    }
};


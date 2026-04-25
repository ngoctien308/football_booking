import { db } from "../config/db.js";

async function getCustomerByClerkId(clerk_user_id) {
    const { data: user, error } = await db
        .from("users")
        .select("id, role, is_locked, deleted_at")
        .eq("clerk_user_id", clerk_user_id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!user) {
        return { error: "NOT_FOUND" };
    }

    if (user.deleted_at) return { error: "DELETED" };
    if (user.is_locked) return { error: "LOCKED" };

    if (user.role !== "customer") {
        return { error: "NOT_CUSTOMER" };
    }

    return { id: user.id };
}

async function getOwnerByClerkId(clerk_user_id) {
    const { data: user, error } = await db
        .from("users")
        .select("id, role, owner_approved, is_locked, deleted_at")
        .eq("clerk_user_id", clerk_user_id)
        .maybeSingle();

    if (error) throw error;
    if (!user) return { error: "NOT_FOUND" };
    if (user.deleted_at) return { error: "DELETED" };
    if (user.is_locked) return { error: "LOCKED" };
    if (user.role !== "owner") return { error: "NOT_OWNER" };
    if (user.owner_approved === false) return { error: "OWNER_NOT_APPROVED" };

    const { data: owner, error: ownerError } = await db
        .from("owners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (ownerError) throw ownerError;
    if (!owner) return { error: "OWNER_PROFILE_NOT_FOUND" };

    return { owner_id: owner.id };
}

async function getReviewStatsAndList(field_id) {
    const { data: reviewRows, error: reviewError } = await db
        .from("reviews")
        .select("id, customer_id, rating, comment, owner_reply, owner_reply_at, created_at")
        .eq("field_id", field_id)
        .order("created_at", { ascending: false });

    if (reviewError) {
        throw reviewError;
    }

    const reviewIds = (reviewRows || []).map((item) => item.id);
    let repliesByReviewId = new Map();

    if (reviewIds.length > 0) {
        const { data: replyRows, error: replyError } = await db
            .from("review_replies")
            .select("id, review_id, reply, created_at")
            .in("review_id", reviewIds)
            .order("created_at", { ascending: true });

        if (replyError) {
            throw replyError;
        }

        repliesByReviewId = new Map();
        for (const row of replyRows || []) {
            if (!repliesByReviewId.has(row.review_id)) repliesByReviewId.set(row.review_id, []);
            repliesByReviewId.get(row.review_id).push({
                id: row.id,
                reply: row.reply,
                created_at: row.created_at,
            });
        }
    }

    const customerIds = [...new Set((reviewRows || []).map((item) => item.customer_id))];
    let userMap = new Map();

    if (customerIds.length > 0) {
        const { data: users, error: userError } = await db
            .from("users")
            .select("id, name, clerk_user_id")
            .in("id", customerIds);

        if (userError) {
            throw userError;
        }

        userMap = new Map((users || []).map((user) => [user.id, user]));
    }

    const reviews = (reviewRows || []).map((review) => {
        const user = userMap.get(review.customer_id) || null;
        const ownerReplies = repliesByReviewId.get(review.id) || [];
        const latestReply = ownerReplies.length > 0 ? ownerReplies[ownerReplies.length - 1] : null;
        return {
            ...review,
            customer_name: user?.name || null,
            clerk_user_id: user?.clerk_user_id || null,
            owner_replies: ownerReplies,
            owner_reply: latestReply?.reply ?? review.owner_reply ?? null,
            owner_reply_at: latestReply?.created_at ?? review.owner_reply_at ?? null,
        };
    });

    const reviewCount = reviews.length;
    const averageRating =
        reviewCount > 0
            ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount
            : 0;

    return {
        reviews,
        average_rating: Number(averageRating) || 0,
        review_count: Number(reviewCount) || 0,
    };
}

export const createReview = async (req, res) => {
    try {
        const { clerk_user_id, field_id, rating, comment } = req.body || {};

        if (!clerk_user_id || !field_id || !rating) {
            return res.status(400).json({
                message: "Missing clerk_user_id, field_id, or rating",
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "User not found" });
        }
        if (customerResult.error === "DELETED") return res.status(403).json({ message: "Account has been deleted" });
        if (customerResult.error === "LOCKED") return res.status(403).json({ message: "Account is locked" });
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Only customer accounts can review fields" });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id")
            .eq("id", field_id)
            .maybeSingle();

        if (fieldError) {
            throw fieldError;
        }

        if (!field) {
            return res.status(404).json({ message: "Field not found" });
        }

        const cleanedComment =
            typeof comment === "string" && comment.trim().length > 0 ? comment.trim() : null;

        const { error: insertError } = await db.from("reviews").insert([
            {
                customer_id: customerResult.id,
                field_id,
                rating: numericRating,
                comment: cleanedComment,
            },
        ]);

        if (insertError) {
            throw insertError;
        }

        const stats = await getReviewStatsAndList(field_id);

        return res.status(201).json({
            message: "Create review successful",
            ...stats,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while creating review", error: error.message });
    }
};

export const updateReview = async (req, res) => {
    try {
        const reviewId = Number(req.params.id);
        const { clerk_user_id, rating, comment } = req.body || {};

        if (!Number.isFinite(reviewId) || !clerk_user_id || !rating) {
            return res.status(400).json({
                message: "Missing review id, clerk_user_id, or rating",
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "User not found" });
        }
        if (customerResult.error === "DELETED") return res.status(403).json({ message: "Account has been deleted" });
        if (customerResult.error === "LOCKED") return res.status(403).json({ message: "Account is locked" });
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Only customer accounts can edit reviews" });
        }

        const { data: review, error: reviewLookupError } = await db
            .from("reviews")
            .select("id, customer_id, field_id")
            .eq("id", reviewId)
            .maybeSingle();

        if (reviewLookupError) {
            throw reviewLookupError;
        }

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        if (review.customer_id !== customerResult.id) {
            return res.status(403).json({ message: "You do not have permission to edit this review" });
        }

        const cleanedComment =
            typeof comment === "string" && comment.trim().length > 0 ? comment.trim() : null;

        const { error: updateError } = await db
            .from("reviews")
            .update({
                rating: numericRating,
                comment: cleanedComment,
                created_at: new Date().toISOString(),
            })
            .eq("id", reviewId);

        if (updateError) {
            throw updateError;
        }

        const stats = await getReviewStatsAndList(review.field_id);

        return res.status(200).json({
            message: "Update review successful",
            ...stats,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while updating review", error: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const reviewId = Number(req.params.id);
        const { clerk_user_id } = req.body || {};

        if (!Number.isFinite(reviewId) || !clerk_user_id) {
            return res.status(400).json({
                message: "Missing review id or clerk_user_id",
            });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "User not found" });
        }
        if (customerResult.error === "DELETED") return res.status(403).json({ message: "Account has been deleted" });
        if (customerResult.error === "LOCKED") return res.status(403).json({ message: "Account is locked" });
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Only customer accounts can delete reviews" });
        }

        const { data: review, error: reviewLookupError } = await db
            .from("reviews")
            .select("id, customer_id, field_id")
            .eq("id", reviewId)
            .maybeSingle();

        if (reviewLookupError) {
            throw reviewLookupError;
        }

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        if (review.customer_id !== customerResult.id) {
            return res.status(403).json({ message: "You do not have permission to delete this review" });
        }

        const { error: deleteError } = await db.from("reviews").delete().eq("id", reviewId);

        if (deleteError) {
            throw deleteError;
        }

        const stats = await getReviewStatsAndList(review.field_id);

        return res.status(200).json({
            message: "Delete review successful",
            ...stats,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while deleting review", error: error.message });
    }
};

export const replyReview = async (req, res) => {
    try {
        const reviewId = Number(req.params.id);
        const { clerk_user_id, owner_reply } = req.body || {};

        if (!Number.isFinite(reviewId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing review id or clerk_user_id" });
        }

        const ownerResult = await getOwnerByClerkId(clerk_user_id);
        if (ownerResult.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (ownerResult.error === "NOT_OWNER") return res.status(403).json({ message: "Only owner accounts can reply reviews" });
        if (ownerResult.error === "DELETED") return res.status(403).json({ message: "Account has been deleted" });
        if (ownerResult.error === "LOCKED") return res.status(403).json({ message: "Account is locked" });
        if (ownerResult.error === "OWNER_NOT_APPROVED") return res.status(403).json({ message: "Owner account is pending approval" });
        if (ownerResult.error === "OWNER_PROFILE_NOT_FOUND") return res.status(403).json({ message: "Owner profile not found" });

        const { data: review, error: reviewError } = await db
            .from("reviews")
            .select("id, field_id")
            .eq("id", reviewId)
            .maybeSingle();

        if (reviewError) throw reviewError;
        if (!review) return res.status(404).json({ message: "Review not found" });

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", review.field_id)
            .maybeSingle();

        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== ownerResult.owner_id) {
            return res.status(403).json({ message: "You do not have permission to reply this review" });
        }

        const cleanedReply =
            typeof owner_reply === "string" && owner_reply.trim().length > 0 ? owner_reply.trim() : null;

        if (!cleanedReply) {
            return res.status(400).json({ message: "Missing owner_reply" });
        }

        const { error: insertReplyError } = await db.from("review_replies").insert([
            {
                review_id: reviewId,
                owner_id: ownerResult.owner_id,
                reply: cleanedReply,
            },
        ]);

        if (insertReplyError) throw insertReplyError;

        const now = new Date().toISOString();
        const { error: updateReviewError } = await db
            .from("reviews")
            .update({
                owner_reply: cleanedReply,
                owner_reply_at: now,
            })
            .eq("id", reviewId);

        if (updateReviewError) throw updateReviewError;

        const stats = await getReviewStatsAndList(review.field_id);

        return res.status(200).json({
            message: "Reply review successful",
            ...stats,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while replying review", error: error.message });
    }
};

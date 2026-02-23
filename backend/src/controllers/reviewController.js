import { db } from "../config/db.js";

async function getCustomerByClerkId(clerk_user_id) {
    const { data: user, error } = await db
        .from("users")
        .select("id, role")
        .eq("clerk_user_id", clerk_user_id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!user) {
        return { error: "NOT_FOUND" };
    }

    if (user.role !== "customer") {
        return { error: "NOT_CUSTOMER" };
    }

    return { id: user.id };
}

async function getReviewStatsAndList(field_id) {
    const { data: reviewRows, error: reviewError } = await db
        .from("reviews")
        .select("id, customer_id, rating, comment, created_at")
        .eq("field_id", field_id)
        .order("created_at", { ascending: false });

    if (reviewError) {
        throw reviewError;
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
        return {
            ...review,
            customer_name: user?.name || null,
            clerk_user_id: user?.clerk_user_id || null,
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
            if (insertError.code === "23505") {
                return res.status(409).json({ message: "You already reviewed this field" });
            }
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

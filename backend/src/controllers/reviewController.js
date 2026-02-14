import { db } from "../config/db.js";

// Helper: lấy user customer theo clerk_user_id
async function getCustomerByClerkId(clerk_user_id) {
    const [users] = await db.query(
        "SELECT id, role FROM users WHERE clerk_user_id = ? LIMIT 1",
        [clerk_user_id]
    );
    if (users.length === 0) {
        return { error: "NOT_FOUND" };
    }
    if (users[0].role !== "customer") {
        return { error: "NOT_CUSTOMER" };
    }
    return { id: users[0].id };
}

// Helper: trả về thống kê + toàn bộ review cho 1 sân
async function getReviewStatsAndList(field_id) {
    const [[stats]] = await db.query(
        "SELECT AVG(rating) AS average_rating, COUNT(*) AS review_count FROM reviews WHERE field_id = ?",
        [field_id]
    );

    const [reviewRows] = await db.query(
        `SELECT r.id,
                r.customer_id,
                r.rating,
                r.comment,
                r.created_at,
                u.name AS customer_name,
                u.clerk_user_id
         FROM reviews r
         JOIN users u ON u.id = r.customer_id
         WHERE r.field_id = ?
         ORDER BY r.created_at DESC`,
        [field_id]
    );

    return {
        reviews: reviewRows,
        average_rating: parseFloat(stats?.average_rating) || 0,
        review_count: parseInt(stats?.review_count) || 0
    };
}

// Tạo MỚI 1 đánh giá (cho phép 1 user đánh giá nhiều lần trên cùng 1 sân)
export const createReview = async (req, res) => {
    try {
        const { clerk_user_id, field_id, rating, comment } = req.body || {};

        if (!clerk_user_id || !field_id || !rating) {
            return res.status(400).json({
                message: "Thiếu clerk_user_id, field_id hoặc rating"
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating phải từ 1 đến 5" });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Chỉ tài khoản khách hàng mới được đánh giá sân" });
        }
        const customerId = customerResult.id;

        // Đảm bảo sân tồn tại
        const [fields] = await db.query("SELECT id FROM fields WHERE id = ? LIMIT 1", [field_id]);
        if (fields.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sân" });
        }

        const cleanedComment =
            typeof comment === "string" && comment.trim().length > 0
                ? comment.trim()
                : null;

        await db.query(
            `INSERT INTO reviews (customer_id, field_id, rating, comment)
             VALUES (?, ?, ?, ?)`,
            [customerId, field_id, numericRating, cleanedComment]
        );

        const stats = await getReviewStatsAndList(field_id);

        res.status(201).json({
            message: "Tạo đánh giá thành công",
            ...stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server khi lưu đánh giá", error: error.message });
    }
};

// Sửa 1 đánh giá (chỉ chủ sở hữu review được sửa)
export const updateReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { clerk_user_id, rating, comment } = req.body || {};

        if (!reviewId || !clerk_user_id || !rating) {
            return res.status(400).json({
                message: "Thiếu id đánh giá, clerk_user_id hoặc rating"
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating phải từ 1 đến 5" });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Chỉ tài khoản khách hàng mới được sửa đánh giá" });
        }
        const customerId = customerResult.id;

        const [reviews] = await db.query(
            "SELECT id, customer_id, field_id FROM reviews WHERE id = ? LIMIT 1",
            [reviewId]
        );
        if (reviews.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đánh giá" });
        }
        const review = reviews[0];
        if (review.customer_id !== customerId) {
            return res.status(403).json({ message: "Bạn không có quyền sửa đánh giá này" });
        }

        const cleanedComment =
            typeof comment === "string" && comment.trim().length > 0
                ? comment.trim()
                : null;

        await db.query(
            `UPDATE reviews
             SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [numericRating, cleanedComment, reviewId]
        );

        const stats = await getReviewStatsAndList(review.field_id);

        res.status(200).json({
            message: "Cập nhật đánh giá thành công",
            ...stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server khi cập nhật đánh giá", error: error.message });
    }
};

// Xóa 1 đánh giá (chỉ chủ sở hữu review được xóa)
export const deleteReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { clerk_user_id } = req.body || {};

        if (!reviewId || !clerk_user_id) {
            return res.status(400).json({
                message: "Thiếu id đánh giá hoặc clerk_user_id"
            });
        }

        const customerResult = await getCustomerByClerkId(clerk_user_id);
        if (customerResult.error === "NOT_FOUND") {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        if (customerResult.error === "NOT_CUSTOMER") {
            return res.status(403).json({ message: "Chỉ tài khoản khách hàng mới được xóa đánh giá" });
        }
        const customerId = customerResult.id;

        const [reviews] = await db.query(
            "SELECT id, customer_id, field_id FROM reviews WHERE id = ? LIMIT 1",
            [reviewId]
        );
        if (reviews.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đánh giá" });
        }
        const review = reviews[0];
        if (review.customer_id !== customerId) {
            return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này" });
        }

        await db.query("DELETE FROM reviews WHERE id = ?", [reviewId]);

        const stats = await getReviewStatsAndList(review.field_id);

        res.status(200).json({
            message: "Xóa đánh giá thành công",
            ...stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server khi xóa đánh giá", error: error.message });
    }
};
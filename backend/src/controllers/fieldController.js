import { db } from "../config/db.js";

const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SLOT_COUNT_PER_DAY = 11; // 6:00 -> 22:30, mỗi slot 90 phút
const NORMAL_PRICE = 500000;
const PEAK_PRICE = 900000;

const toImageUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (String(rawUrl).startsWith("http")) return rawUrl;
    return `${APP_BASE_URL}${String(rawUrl).startsWith("/") ? "" : "/"}${rawUrl}`;
};

const normalizeBoolean = (value) => value === true || value === 1 || value === "1";

const calculateReviewStats = (reviews) => {
    const count = reviews.length;
    if (count === 0) {
        return { average_rating: 0, review_count: 0 };
    }

    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return {
        average_rating: total / count,
        review_count: count,
    };
};

const getDefaultSlots = () => {
    // Slots: 06:00-07:30, 07:30-09:00, 09:00-10:30, 10:30-12:00, 12:00-13:30,
    //        13:30-15:00, 15:00-16:30, 16:30-18:00 (peak), 18:00-19:30 (peak),
    //        19:30-21:00, 21:00-22:30
    const slots = [];
    for (let i = 0; i < SLOT_COUNT_PER_DAY; i++) {
        const totalStartMin = 6 * 60 + i * 90;
        const totalEndMin = totalStartMin + 90;

        const h1 = Math.floor(totalStartMin / 60);
        const m1 = totalStartMin % 60;
        const h2 = Math.floor(totalEndMin / 60);
        const m2 = totalEndMin % 60;

        const start_time = `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}:00`;
        const end_time = `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}:00`;

        // Peak 17:00-19:00 => các slot overlap là 16:30-18:00 và 18:00-19:30
        const isPeak = (h1 === 16 && m1 === 30) || (h1 === 18 && m1 === 0);

        slots.push({
            start_time,
            end_time,
            type: isPeak ? "peak" : "normal",
            price: isPeak ? PEAK_PRICE : NORMAL_PRICE,
        });
    }
    return slots;
};

const calculateRemainingSlots = (fieldId, bookingRows) => {
    const bookedStarts = new Set(
        (bookingRows || []).filter((row) => row.field_id === fieldId).map((row) => row.start_time)
    );
    return Math.max(SLOT_COUNT_PER_DAY - bookedStarts.size, 0);
};

export const getAllFields = async (req, res) => {
    try {
        const { data: fields, error: fieldsError } = await db
            .from("fields")
            .select("*")
            .order("created_at", { ascending: false });

        if (fieldsError) {
            throw fieldsError;
        }

        if (!fields || fields.length === 0) {
            return res.status(200).json({ fields: [] });
        }

        const fieldIds = fields.map((field) => field.id);
        const today = new Date().toISOString().slice(0, 10);

        const [imagesResult, bookingsResult, reviewsResult] = await Promise.all([
            db
                .from("field_images")
                .select("field_id, image_url, is_primary")
                .in("field_id", fieldIds)
                .order("created_at", { ascending: false }),
            db
                .from("bookings")
                .select("field_id, start_time, booking_date")
                .in("field_id", fieldIds)
                .eq("booking_date", today)
                .in("status", ["pending", "approved"]),
            db.from("reviews").select("field_id, rating").in("field_id", fieldIds),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (reviewsResult.error) throw reviewsResult.error;

        const imagesByField = new Map();
        for (const image of imagesResult.data || []) {
            if (!imagesByField.has(image.field_id)) {
                imagesByField.set(image.field_id, []);
            }
            imagesByField.get(image.field_id).push(image);
        }

        const reviewsByField = new Map();
        for (const review of reviewsResult.data || []) {
            if (!reviewsByField.has(review.field_id)) {
                reviewsByField.set(review.field_id, []);
            }
            reviewsByField.get(review.field_id).push(review);
        }

        const formattedFields = fields.map((field) => {
            const fieldImages = imagesByField.get(field.id) || [];
            const primaryImage =
                fieldImages.find((image) => normalizeBoolean(image.is_primary)) || fieldImages[0] || null;

            const reviewStats = calculateReviewStats(reviewsByField.get(field.id) || []);

            return {
                ...field,
                primary_image: toImageUrl(primaryImage?.image_url || null),
                remaining_slots: calculateRemainingSlots(field.id, bookingsResult.data || []),
                average_rating: Number(reviewStats.average_rating) || 0,
                review_count: Number(reviewStats.review_count) || 0,
            };
        });

        return res.status(200).json({ fields: formattedFields });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const getFieldDetail = async (req, res) => {
    try {
        const fieldId = Number(req.params.id);
        if (!Number.isFinite(fieldId)) {
            return res.status(400).json({ message: "Missing or invalid field id" });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("*")
            .eq("id", fieldId)
            .maybeSingle();

        if (fieldError) {
            throw fieldError;
        }

        if (!field) {
            return res.status(404).json({ message: "Field not found" });
        }

        const today = new Date().toISOString().slice(0, 10);

        const [imagesResult, reviewsResult, bookingsResult] = await Promise.all([
            db
                .from("field_images")
                .select("id, image_url, is_primary")
                .eq("field_id", fieldId)
                .order("is_primary", { ascending: false })
                .order("created_at", { ascending: false }),
            db
                .from("reviews")
                .select("id, customer_id, rating, comment, created_at")
                .eq("field_id", fieldId)
                .order("created_at", { ascending: false }),
            db
                .from("bookings")
                .select("start_time, booking_date")
                .eq("field_id", fieldId)
                .eq("booking_date", today)
                .in("status", ["pending", "approved"]),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (reviewsResult.error) throw reviewsResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        const customerIds = [...new Set((reviewsResult.data || []).map((review) => review.customer_id))];
        let userMap = new Map();

        if (customerIds.length > 0) {
            const { data: users, error: usersError } = await db
                .from("users")
                .select("id, name, clerk_user_id")
                .in("id", customerIds);

            if (usersError) {
                throw usersError;
            }

            userMap = new Map((users || []).map((user) => [user.id, user]));
        }

        const reviews = (reviewsResult.data || []).map((review) => {
            const user = userMap.get(review.customer_id) || null;
            return {
                ...review,
                customer_name: user?.name || null,
                clerk_user_id: user?.clerk_user_id || null,
            };
        });

        const timeSlots = getDefaultSlots();

        const reviewStats = calculateReviewStats(reviews);

        const formattedField = {
            ...field,
            remaining_slots: Math.max(SLOT_COUNT_PER_DAY - new Set((bookingsResult.data || []).map((b) => b.start_time)).size, 0),
            average_rating: Number(reviewStats.average_rating) || 0,
            review_count: Number(reviewStats.review_count) || 0,
        };

        const images = (imagesResult.data || []).map((image) => ({
            ...image,
            image_url: toImageUrl(image.image_url),
        }));

        return res.status(200).json({
            field: formattedField,
            images,
            reviews,
            time_slots: timeSlots,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const getFieldsByOwner = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;

        const { data: user, error: userError } = await db
            .from("users")
            .select("id")
            .eq("clerk_user_id", clerk_user_id)
            .eq("role", "owner")
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(200).json({ fields: [] });
        }

        const { data: owner, error: ownerError } = await db
            .from("owners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerError) {
            throw ownerError;
        }

        if (!owner) {
            return res.status(200).json({ fields: [] });
        }

        const { data: fields, error: fieldsError } = await db
            .from("fields")
            .select("id, field_name, address, description, status, created_at")
            .eq("owner_id", owner.id)
            .order("created_at", { ascending: false });

        if (fieldsError) {
            throw fieldsError;
        }

        if (!fields || fields.length === 0) {
            return res.status(200).json({ fields: [] });
        }

        const fieldIds = fields.map((field) => field.id);
        const { data: images, error: imageError } = await db
            .from("field_images")
            .select("field_id, image_url")
            .in("field_id", fieldIds)
            .eq("is_primary", true);

        if (imageError) {
            throw imageError;
        }

        const imageByFieldId = new Map((images || []).map((img) => [img.field_id, img.image_url]));

        const merged = fields
            .map((field) => ({
                image_url: imageByFieldId.get(field.id) || null,
                ...field,
            }))
            .filter((field) => field.image_url);

        return res.status(200).json({ fields: merged });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const createField = async (req, res) => {
    try {
        const body = req.body || {};
        const clerk_user_id = body.clerk_user_id;
        const field_name = body.field_name;
        const address = body.address;
        const description = body.description;

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
        } else if (Array.isArray(body.images)) {
            imageUrls = body.images.filter((url) => url && String(url).trim());
        }

        if (!clerk_user_id || !field_name || !address) {
            return res.status(400).json({
                message: "Missing required fields: clerk_user_id, field_name, address",
            });
        }

        const { data: user, error: userError } = await db
            .from("users")
            .select("id, name")
            .eq("clerk_user_id", clerk_user_id)
            .eq("role", "owner")
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(403).json({ message: "Only owner accounts can create fields." });
        }

        const ownerName = user.name || "Owner";
        const { data: ownerRow, error: ownerLookupError } = await db
            .from("owners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerLookupError) {
            throw ownerLookupError;
        }

        let ownerId = ownerRow?.id;

        if (!ownerId) {
            const { data: ownerInserted, error: ownerInsertError } = await db
                .from("owners")
                .insert([{ user_id: user.id, owner_name: ownerName, phone: "" }])
                .select("id")
                .single();

            if (ownerInsertError) {
                throw ownerInsertError;
            }

            ownerId = ownerInserted.id;
        }

        const { data: insertedField, error: fieldInsertError } = await db
            .from("fields")
            .insert([
                {
                    field_name,
                    address,
                    description: description || null,
                    owner_id: ownerId,
                    status: "active",
                },
            ])
            .select("id")
            .single();

        if (fieldInsertError) {
            throw fieldInsertError;
        }

        const fieldId = insertedField.id;

        if (imageUrls.length > 0) {
            const imageRows = imageUrls
                .map((url, index) => String(url).trim())
                .filter(Boolean)
                .map((url, index) => ({
                    field_id: fieldId,
                    image_url: url,
                    is_primary: index === 0,
                }));

            if (imageRows.length > 0) {
                const { error: imagesError } = await db.from("field_images").insert(imageRows);
                if (imagesError) {
                    throw imagesError;
                }
            }
        }

        return res.status(201).json({ message: "Create field successful.", fieldId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const updateField = async (req, res) => {
    try {
        const fieldId = Number(req.params.id);
        const body = req.body || {};
        const clerk_user_id = body.clerk_user_id;
        const field_name = body.field_name;
        const address = body.address;
        const description = body.description;
        const status = body.status;

        // Handle new uploaded images (optional)
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
        } else if (Array.isArray(body.images)) {
            imageUrls = body.images.filter((url) => url && String(url).trim());
        }

        if (!Number.isFinite(fieldId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid field id or clerk_user_id" });
        }

        const { data: user, error: userError } = await db
            .from("users")
            .select("id, role")
            .eq("clerk_user_id", clerk_user_id)
            .maybeSingle();

        if (userError) throw userError;
        if (!user || user.role !== "owner") {
            return res.status(403).json({ message: "Only owner accounts can update fields." });
        }

        const { data: owner, error: ownerError } = await db
            .from("owners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerError) throw ownerError;
        if (!owner) return res.status(403).json({ message: "Owner profile not found" });

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", fieldId)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== owner.id) {
            return res.status(403).json({ message: "You cannot update this field" });
        }

        const updateData = {};
        if (typeof field_name === "string" && field_name.trim()) updateData.field_name = field_name.trim();
        if (typeof address === "string" && address.trim()) updateData.address = address.trim();
        if (typeof description === "string") updateData.description = description.trim() || null;
        if (status === "active" || status === "inactive") updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        const { data: updated, error: updateError } = await db
            .from("fields")
            .update(updateData)
            .eq("id", fieldId)
            .select("id, field_name, address, description, status, created_at")
            .maybeSingle();
        if (updateError) throw updateError;

        // If there are new images, append them to field_images as non-primary images
        if (imageUrls.length > 0) {
            const imageRows = imageUrls
                .map((url) => String(url).trim())
                .filter(Boolean)
                .map((url) => ({
                    field_id: fieldId,
                    image_url: url,
                    is_primary: false,
                }));

            if (imageRows.length > 0) {
                const { error: imagesError } = await db.from("field_images").insert(imageRows);
                if (imagesError) {
                    throw imagesError;
                }
            }
        }

        return res.status(200).json({ message: "Field updated successfully", field: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const deleteField = async (req, res) => {
    try {
        const fieldId = Number(req.params.id);
        const { clerk_user_id } = req.body || {};

        if (!Number.isFinite(fieldId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid field id or clerk_user_id" });
        }

        const { data: user, error: userError } = await db
            .from("users")
            .select("id, role")
            .eq("clerk_user_id", clerk_user_id)
            .maybeSingle();

        if (userError) throw userError;
        if (!user || user.role !== "owner") {
            return res.status(403).json({ message: "Only owner accounts can delete fields." });
        }

        const { data: owner, error: ownerError } = await db
            .from("owners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerError) throw ownerError;
        if (!owner) return res.status(403).json({ message: "Owner profile not found" });

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", fieldId)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== owner.id) {
            return res.status(403).json({ message: "You cannot delete this field" });
        }

        const { error: deleteError } = await db.from("fields").delete().eq("id", fieldId);
        if (deleteError) throw deleteError;

        return res.status(200).json({ message: "Field deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

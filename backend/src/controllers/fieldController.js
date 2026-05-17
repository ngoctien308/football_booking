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
    return calculateRemainingSlotsForDate({
        fieldId,
        bookingRows,
        bookingDate: new Date().toISOString().slice(0, 10),
    });
};

const calculateRemainingSlotsForDate = ({ fieldId, bookingRows, bookingDate }) => {
    const today = new Date().toISOString().slice(0, 10);
    const dateStr = String(bookingDate || "").slice(0, 10);

    if (!dateStr) return 0;

    if (dateStr < today) return 0;

    const bookedStarts = new Set(
        (bookingRows || [])
            .filter((row) => row.field_id === fieldId && String(row.booking_date || "").slice(0, 10) === dateStr)
            .map((row) => row.start_time)
    );

    if (dateStr !== today) {
        return Math.max(SLOT_COUNT_PER_DAY - bookedStarts.size, 0);
    }

    const now = new Date();
    const pastOrCurrentSlots = new Set(
        getDefaultSlots()
            .filter((slot) => {
                const [h, m] = slot.start_time.split(":").map(Number);
                const slotTime = new Date();
                slotTime.setHours(h, m, 0, 0);
                return slotTime <= now;
            })
            .map((slot) => slot.start_time)
    );

    // Slots earlier than (or equal) current time are considered unavailable,
    // even if not booked.
    const unavailable = new Set([...bookedStarts, ...pastOrCurrentSlots]);

    return Math.max(SLOT_COUNT_PER_DAY - unavailable.size, 0);
};

async function getOwnerFromClerk(clerkUserId) {
    const { data: user, error: userError } = await db
        .from("users")
        .select("id, role, owner_approved, is_locked, deleted_at")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();
    if (userError) throw userError;
    if (!user || user.role !== "owner") return null;
    if (user.deleted_at) return null;
    if (user.is_locked) return null;
    if (user.owner_approved === false) return null;

    const { data: owner, error: ownerError } = await db
        .from("owners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner) return null;

    return { userId: user.id, ownerId: owner.id };
}

export const getAllFields = async (req, res) => {
    try {
        const bookingDate = String(req.query.booking_date || "").trim() || new Date().toISOString().slice(0, 10);
        const startTimeRaw = String(req.query.start_time || "").trim();
        const addressRaw = String(req.query.address || "").trim();

        let normalizedStartTime = "";
        if (startTimeRaw) {
            const timeOnly = startTimeRaw.slice(0, 5);
            if (/^\d{2}:\d{2}$/.test(timeOnly)) {
                const [hh, mm] = timeOnly.split(":").map(Number);
                if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
                    return res.status(400).json({ message: "Invalid start_time" });
                }
                normalizedStartTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
            } else if (/^\d{2}:\d{2}:\d{2}$/.test(startTimeRaw)) {
                const [hh, mm, ss] = startTimeRaw.split(":").map(Number);
                if (
                    !Number.isFinite(hh) ||
                    !Number.isFinite(mm) ||
                    !Number.isFinite(ss) ||
                    hh < 0 ||
                    hh > 23 ||
                    mm < 0 ||
                    mm > 59 ||
                    ss < 0 ||
                    ss > 59
                ) {
                    return res.status(400).json({ message: "Invalid start_time" });
                }
                normalizedStartTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
            }
        }

        const defaultSlots = getDefaultSlots();
        if (startTimeRaw && !normalizedStartTime) {
            return res.status(400).json({ message: "Invalid start_time" });
        }

        let fieldsQuery = db.from("fields").select("*").order("created_at", { ascending: false });
        if (addressRaw) {
            fieldsQuery = fieldsQuery.ilike("address", `%${addressRaw}%`);
        }

        const { data: fields, error: fieldsError } = await fieldsQuery;

        if (fieldsError) throw fieldsError;
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
                .eq("booking_date", bookingDate)
                .in("status", ["pending", "approved"]),
            db.from("reviews").select("field_id, rating").in("field_id", fieldIds),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (reviewsResult.error) throw reviewsResult.error;

        const imagesByField = new Map();
        for (const image of imagesResult.data || []) {
            if (!imagesByField.has(image.field_id)) imagesByField.set(image.field_id, []);
            imagesByField.get(image.field_id).push(image);
        }

        const reviewsByField = new Map();
        for (const review of reviewsResult.data || []) {
            if (!reviewsByField.has(review.field_id)) reviewsByField.set(review.field_id, []);
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
                remaining_slots: calculateRemainingSlotsForDate({
                    fieldId: field.id,
                    bookingRows: bookingsResult.data || [],
                    bookingDate,
                }),
                average_rating: Number(reviewStats.average_rating) || 0,
                review_count: Number(reviewStats.review_count) || 0,
            };
        });

        if (normalizedStartTime) {
            // Keep only fields that have at least one available slot whose start_time >= requested time.
            // Example: request 05:00 -> show fields with 05:30, 06:00... still available.
            const candidateStartTimes = defaultSlots
                .map((s) => s.start_time)
                .filter((t) => t >= normalizedStartTime);
            const candidateStartTimeSet = new Set(candidateStartTimes);

            // For today, slots earlier than (or equal) now are unavailable even if not booked.
            const pastOrCurrentToday = (() => {
                if (bookingDate !== today) return new Set();
                const now = new Date();
                return new Set(
                    defaultSlots
                        .filter((slot) => {
                            if (slot.start_time < normalizedStartTime) return false;
                            const [h, m] = slot.start_time.split(":").map(Number);
                            const slotTime = new Date();
                            slotTime.setHours(h, m, 0, 0);
                            return slotTime <= now;
                        })
                        .map((slot) => slot.start_time)
                );
            })();

            // Build a map: field_id -> Set(booked start_time) for this date.
            const bookedStartsByField = new Map();
            for (const row of bookingsResult.data || []) {
                if (!candidateStartTimeSet.has(row.start_time)) continue;
                if (!bookedStartsByField.has(row.field_id)) bookedStartsByField.set(row.field_id, new Set());
                bookedStartsByField.get(row.field_id).add(row.start_time);
            }

            const filtered = formattedFields.filter((f) => {
                const bookedSet = bookedStartsByField.get(f.id) || new Set();
                for (const t of candidateStartTimes) {
                    if (pastOrCurrentToday.has(t)) continue;
                    if (bookedSet.has(t)) continue;
                    return true;
                }
                return false;
            });

            return res.status(200).json({ fields: filtered });
        }

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

        if (fieldError) throw fieldError;
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
                .select("id, customer_id, rating, comment, owner_reply, owner_reply_at, created_at")
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

        const reviewRows = reviewsResult.data || [];
        const reviewIds = reviewRows.map((review) => review.id);
        let repliesByReviewId = new Map();

        if (reviewIds.length > 0) {
            const { data: replyRows, error: replyError } = await db
                .from("review_replies")
                .select("id, review_id, reply, created_at")
                .in("review_id", reviewIds)
                .order("created_at", { ascending: true });

            if (replyError) throw replyError;

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

        const customerIds = [...new Set(reviewRows.map((review) => review.customer_id))];
        let userMap = new Map();

        if (customerIds.length > 0) {
            const { data: users, error: usersError } = await db
                .from("users")
                .select("id, name, clerk_user_id")
                .in("id", customerIds);

            if (usersError) throw usersError;
            userMap = new Map((users || []).map((user) => [user.id, user]));
        }

        const reviews = reviewRows.map((review) => {
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

        const timeSlots = getDefaultSlots();
        const reviewStats = calculateReviewStats(reviews);
        const remainingSlotNumber = calculateRemainingSlotsForDate({
            fieldId,
            bookingRows: bookingsResult.data || [],
            bookingDate: today,
        });

        const formattedField = {
            ...field,
            remaining_slots: remainingSlotNumber,
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

        const ownerMeta = await getOwnerFromClerk(clerk_user_id);
        if (!ownerMeta) {
            return res.status(200).json({ fields: [] });
        }

        const { data: fields, error: fieldsError } = await db
            .from("fields")
            .select("id, field_name, address, description, status, created_at")
            .eq("owner_id", ownerMeta.ownerId)
            .order("created_at", { ascending: false });

        if (fieldsError) throw fieldsError;
        if (!fields || fields.length === 0) {
            return res.status(200).json({ fields: [] });
        }

        const fieldIds = fields.map((field) => field.id);
        const { data: images, error: imageError } = await db
            .from("field_images")
            .select("field_id, image_url")
            .in("field_id", fieldIds)
            .eq("is_primary", true);

        if (imageError) throw imageError;

        const imageByFieldId = new Map((images || []).map((img) => [img.field_id, img.image_url]));

        const merged = fields.map((field) => ({
            image_url: imageByFieldId.get(field.id) || null,
            ...field,
        }));

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
            .select("id, name, owner_approved, is_locked, deleted_at")
            .eq("clerk_user_id", clerk_user_id)
            .eq("role", "owner")
            .maybeSingle();

        if (userError) throw userError;
        if (!user) {
            return res.status(403).json({ message: "Only owner accounts can create fields." });
        }
        if (user.deleted_at) return res.status(403).json({ message: "Account has been deleted" });
        if (user.is_locked) return res.status(403).json({ message: "Account is locked" });
        if (user.owner_approved === false) return res.status(403).json({ message: "Owner account is pending approval" });

        const ownerName = user.name || "Owner";
        const { data: ownerRow, error: ownerLookupError } = await db
            .from("owners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerLookupError) throw ownerLookupError;

        let ownerId = ownerRow?.id;

        if (!ownerId) {
            const { data: ownerInserted, error: ownerInsertError } = await db
                .from("owners")
                .insert([{ user_id: user.id, owner_name: ownerName, phone: "" }])
                .select("id")
                .single();

            if (ownerInsertError) throw ownerInsertError;
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

        if (fieldInsertError) throw fieldInsertError;

        const fieldId = insertedField.id;

        if (imageUrls.length > 0) {
            const imageRows = imageUrls
                .map((url) => String(url).trim())
                .filter(Boolean)
                .map((url, index) => ({
                    field_id: fieldId,
                    image_url: url,
                    is_primary: index === 0,
                }));

            if (imageRows.length > 0) {
                const { error: imagesError } = await db.from("field_images").insert(imageRows);
                if (imagesError) throw imagesError;
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

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
        } else if (Array.isArray(body.images)) {
            imageUrls = body.images.filter((url) => url && String(url).trim());
        }

        if (!Number.isFinite(fieldId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid field id or clerk_user_id" });
        }

        const ownerMeta = await getOwnerFromClerk(clerk_user_id);
        if (!ownerMeta) {
            return res.status(403).json({ message: "Only owner accounts can update fields." });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", fieldId)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== ownerMeta.ownerId) {
            return res.status(403).json({ message: "You cannot update this field" });
        }

        const updateData = {};
        if (typeof field_name === "string" && field_name.trim()) updateData.field_name = field_name.trim();
        if (typeof address === "string" && address.trim()) updateData.address = address.trim();
        if (typeof description === "string") updateData.description = description.trim() || null;
        if (status === "active" || status === "inactive") updateData.status = status;

        const hasFieldUpdates = Object.keys(updateData).length > 0;
        if (!hasFieldUpdates && imageUrls.length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        let updated = null;
        if (hasFieldUpdates) {
            const { data, error: updateError } = await db
                .from("fields")
                .update(updateData)
                .eq("id", fieldId)
                .select("id, field_name, address, description, status, created_at")
                .maybeSingle();
            if (updateError) throw updateError;
            updated = data;
        }

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
                if (imagesError) throw imagesError;
            }
        }

        return res.status(200).json({ message: "Field updated successfully", field: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

export const deleteFieldImage = async (req, res) => {
    try {
        const imageId = Number(req.params.image_id);
        const { clerk_user_id } = req.body || {};

        if (!Number.isFinite(imageId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid image id or clerk_user_id" });
        }

        const ownerMeta = await getOwnerFromClerk(clerk_user_id);
        if (!ownerMeta) {
            return res.status(403).json({ message: "Only owner accounts can delete field images." });
        }

        const { data: imageRow, error: imageError } = await db
            .from("field_images")
            .select("id, field_id, is_primary")
            .eq("id", imageId)
            .maybeSingle();
        if (imageError) throw imageError;
        if (!imageRow) return res.status(404).json({ message: "Image not found" });

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", imageRow.field_id)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== ownerMeta.ownerId) {
            return res.status(403).json({ message: "You cannot delete this image" });
        }

        const { data: allImages, error: countError } = await db
            .from("field_images")
            .select("id, is_primary")
            .eq("field_id", imageRow.field_id)
            .order("created_at", { ascending: true });
        if (countError) throw countError;

        if (!allImages || allImages.length <= 1) {
            return res.status(409).json({ message: "Field must keep at least one image" });
        }

        const { error: deleteError } = await db.from("field_images").delete().eq("id", imageId);
        if (deleteError) throw deleteError;

        if (normalizeBoolean(imageRow.is_primary)) {
            const nextImage = (allImages || []).find((img) => img.id !== imageId);
            if (nextImage) {
                const { error: promoteError } = await db
                    .from("field_images")
                    .update({ is_primary: true })
                    .eq("id", nextImage.id);
                if (promoteError) throw promoteError;
            }
        }

        return res.status(200).json({ message: "Image deleted successfully" });
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

        const ownerMeta = await getOwnerFromClerk(clerk_user_id);
        if (!ownerMeta) {
            return res.status(403).json({ message: "Only owner accounts can delete fields." });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", fieldId)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });
        if (field.owner_id !== ownerMeta.ownerId) {
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

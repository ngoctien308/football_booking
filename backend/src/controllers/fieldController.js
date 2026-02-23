import { db } from "../config/db.js";

const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

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

const calculateRemainingSlots = (fieldId, fieldPriceRows, bookingRows) => {
    const availableSlotIds = new Set(
        fieldPriceRows.filter((row) => row.field_id === fieldId).map((row) => row.time_slot_id)
    );

    const bookedSlotIds = new Set(
        bookingRows
            .filter((row) => row.field_id === fieldId)
            .map((row) => row.time_slot_id)
    );

    return Math.max(availableSlotIds.size - bookedSlotIds.size, 0);
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

        const [imagesResult, pricesResult, bookingsResult, reviewsResult] = await Promise.all([
            db
                .from("field_images")
                .select("field_id, image_url, is_primary")
                .in("field_id", fieldIds)
                .order("created_at", { ascending: false }),
            db.from("field_prices").select("field_id, time_slot_id").in("field_id", fieldIds),
            db
                .from("bookings")
                .select("field_id, time_slot_id")
                .in("field_id", fieldIds)
                .gte("booking_date", today)
                .in("status", ["pending", "approved"]),
            db.from("reviews").select("field_id, rating").in("field_id", fieldIds),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (pricesResult.error) throw pricesResult.error;
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
                remaining_slots: calculateRemainingSlots(field.id, pricesResult.data || [], bookingsResult.data || []),
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

        const [imagesResult, reviewsResult, pricesResult, bookingsResult] = await Promise.all([
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
            db.from("field_prices").select("time_slot_id, price").eq("field_id", fieldId),
            db
                .from("bookings")
                .select("time_slot_id")
                .eq("field_id", fieldId)
                .gte("booking_date", today)
                .in("status", ["pending", "approved"]),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (reviewsResult.error) throw reviewsResult.error;
        if (pricesResult.error) throw pricesResult.error;
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

        const timeSlotIds = [...new Set((pricesResult.data || []).map((price) => price.time_slot_id))];
        let timeSlotMap = new Map();

        if (timeSlotIds.length > 0) {
            const { data: timeSlots, error: slotError } = await db
                .from("time_slots")
                .select("id, start_time, end_time, type")
                .in("id", timeSlotIds)
                .order("start_time", { ascending: true });

            if (slotError) {
                throw slotError;
            }

            timeSlotMap = new Map((timeSlots || []).map((slot) => [slot.id, slot]));
        }

        const timeSlots = (pricesResult.data || [])
            .map((price) => {
                const slot = timeSlotMap.get(price.time_slot_id);
                if (!slot) return null;

                return {
                    time_slot_id: slot.id,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    type: slot.type,
                    price: price.price,
                };
            })
            .filter(Boolean)
            .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

        const reviewStats = calculateReviewStats(reviews);

        const formattedField = {
            ...field,
            remaining_slots: Math.max(
                new Set((pricesResult.data || []).map((item) => item.time_slot_id)).size -
                    new Set((bookingsResult.data || []).map((item) => item.time_slot_id)).size,
                0
            ),
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
            .select("id, field_name, province, district, ward, street_address, description, status, created_at")
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

async function getOrCreateTimeSlot(startTime, endTime, type = "normal") {
    const { data: existing, error: existingError } = await db
        .from("time_slots")
        .select("id")
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .eq("type", type)
        .limit(1);

    if (existingError) {
        throw existingError;
    }

    if (existing && existing.length > 0) {
        return existing[0].id;
    }

    const { data: inserted, error: insertError } = await db
        .from("time_slots")
        .insert([{ start_time: startTime, end_time: endTime, type }])
        .select("id")
        .single();

    if (insertError) {
        throw insertError;
    }

    return inserted.id;
}

export const createField = async (req, res) => {
    try {
        const body = req.body || {};
        const clerk_user_id = body.clerk_user_id;
        const field_name = body.field_name;
        const province = body.province;
        const district = body.district;
        const ward = body.ward;
        const street_address = body.street_address;
        const description = body.description;

        let slots = body.slots;
        if (typeof slots === "string") {
            try {
                slots = JSON.parse(slots);
            } catch {
                slots = [];
            }
        }
        if (!Array.isArray(slots)) slots = [];

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
        } else if (Array.isArray(body.images)) {
            imageUrls = body.images.filter((url) => url && String(url).trim());
        }

        if (!clerk_user_id || !field_name || !province || !ward || !street_address) {
            return res.status(400).json({
                message: "Missing required fields: clerk_user_id, field_name, province, ward, street_address",
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
                    province,
                    district: district || "",
                    ward,
                    street_address,
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

        for (const slot of slots) {
            const startTime = slot.start_time || slot.startTime;
            const endTime = slot.end_time || slot.endTime;
            const type = slot.type === "peak" ? "peak" : "normal";
            const price = Number(slot.price);

            if (!startTime || !endTime || !Number.isFinite(price) || price < 0) {
                continue;
            }

            const timeSlotId = await getOrCreateTimeSlot(startTime, endTime, type);
            const { error: priceError } = await db.from("field_prices").insert([
                {
                    field_id: fieldId,
                    time_slot_id: timeSlotId,
                    price,
                },
            ]);

            if (priceError && priceError.code !== "23505") {
                throw priceError;
            }
        }

        return res.status(201).json({ message: "Create field successful.", fieldId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

import { db } from "../config/db.js";

export const getAllFields = async (req, res) => {
    try {
        // Lấy thông tin sân kèm ảnh chính, số slot còn lại và review trung bình
        const query = `
            SELECT 
                f.*,
                COALESCE(
                    (SELECT image_url FROM field_images WHERE field_id = f.id AND is_primary = 1 LIMIT 1),
                    (SELECT image_url FROM field_images WHERE field_id = f.id LIMIT 1),
                    NULL
                ) as primary_image,
                COALESCE(
                    (SELECT COUNT(DISTINCT fp.time_slot_id) 
                     FROM field_prices fp 
                     WHERE fp.field_id = f.id) - 
                    (SELECT COUNT(DISTINCT b.time_slot_id) 
                     FROM bookings b 
                     WHERE b.field_id = f.id 
                     AND b.booking_date >= CURDATE() 
                     AND b.status IN ('pending', 'approved')),
                    0
                ) as remaining_slots,
                COALESCE(
                    (SELECT AVG(rating) FROM reviews WHERE field_id = f.id),
                    0
                ) as average_rating,
                COALESCE(
                    (SELECT COUNT(*) FROM reviews WHERE field_id = f.id),
                    0
                ) as review_count
            FROM fields f
            ORDER BY f.created_at DESC
        `;
        const [fieldRows] = await db.query(query);
        
        // Format lại dữ liệu
        const fields = fieldRows.map(field => ({
            ...field,
            primary_image: field.primary_image ? 
                (field.primary_image.startsWith('http') ? field.primary_image : `http://localhost:3000${field.primary_image}`) : 
                null,
            remaining_slots: parseInt(field.remaining_slots) || 0,
            average_rating: parseFloat(field.average_rating) || 0,
            review_count: parseInt(field.review_count) || 0
        }));
        
        res.status(200).json({ fields });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

// Lấy chi tiết 1 sân: thông tin, ảnh, slot còn lại, rating + danh sách review
export const getFieldDetail = async (req, res) => {
    try {
        const fieldId = req.params.id;
        if (!fieldId) {
            return res.status(400).json({ message: "Thiếu id sân" });
        }

        const fieldQuery = `
            SELECT 
                f.*,
                COALESCE(
                    (SELECT COUNT(DISTINCT fp.time_slot_id) 
                     FROM field_prices fp 
                     WHERE fp.field_id = f.id) - 
                    (SELECT COUNT(DISTINCT b.time_slot_id) 
                     FROM bookings b 
                     WHERE b.field_id = f.id 
                     AND b.booking_date >= CURDATE() 
                     AND b.status IN ('pending', 'approved')),
                    0
                ) as remaining_slots,
                COALESCE(
                    (SELECT AVG(rating) FROM reviews WHERE field_id = f.id),
                    0
                ) as average_rating,
                COALESCE(
                    (SELECT COUNT(*) FROM reviews WHERE field_id = f.id),
                    0
                ) as review_count
            FROM fields f
            WHERE f.id = ?
            LIMIT 1
        `;
        const [fieldRows] = await db.query(fieldQuery, [fieldId]);
        if (fieldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sân" });
        }

        const field = fieldRows[0];

        const [imageRows] = await db.query(
            "SELECT id, image_url, is_primary FROM field_images WHERE field_id = ? ORDER BY is_primary DESC, created_at DESC",
            [fieldId]
        );

        const images = imageRows.map((img) => ({
            ...img,
            image_url: img.image_url.startsWith("http")
                ? img.image_url
                : `http://localhost:3000${img.image_url}`,
        }));

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
            [fieldId]
        );

        const [slotRows] = await db.query(
            `SELECT 
                ts.id as time_slot_id,
                ts.start_time,
                ts.end_time,
                ts.type,
                fp.price
             FROM field_prices fp
             JOIN time_slots ts ON ts.id = fp.time_slot_id
             WHERE fp.field_id = ?
             ORDER BY ts.start_time ASC`,
            [fieldId]
        );

        const formattedField = {
            ...field,
            remaining_slots: parseInt(field.remaining_slots) || 0,
            average_rating: parseFloat(field.average_rating) || 0,
            review_count: parseInt(field.review_count) || 0,
        };

        res.status(200).json({
            field: formattedField,
            images,
            reviews: reviewRows,
            time_slots: slotRows,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

/** Lấy danh sách sân của chủ sân (theo clerk_user_id) */
export const getFieldsByOwner = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;
        const [users] = await db.query('SELECT id FROM users WHERE clerk_user_id = ? AND role = ?', [clerk_user_id, 'owner']);
        if (users.length === 0) {
            return res.status(200).json({ fields: [] });
        }
        const userId = users[0].id;
        const [owners] = await db.query('SELECT id FROM owners WHERE user_id = ?', [userId]);
        if (owners.length === 0) {
            return res.status(200).json({ fields: [] });
        }
        const ownerId = owners[0].id;
        const [fields] = await db.query(
            'SELECT fi.image_url, f.id, f.field_name, f.province, f.district, f.ward, f.street_address, f.description, f.status, f.created_at FROM fields f INNER JOIN field_images fi ON f.id = fi.field_id WHERE f.owner_id = ? and fi.is_primary = 1 ORDER BY f.created_at DESC',
            [ownerId]
        );
        res.status(200).json({ fields });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

/** Lấy hoặc tạo time_slot, trả về time_slot id */
async function getOrCreateTimeSlot(startTime, endTime, type = 'normal') {
    const [rows] = await db.query(
        'SELECT id FROM time_slots WHERE start_time = ? AND end_time = ? AND type = ? LIMIT 1',
        [startTime, endTime, type]
    );
    if (rows.length > 0) return rows[0].id;
    const [insertResult] = await db.query(
        'INSERT INTO time_slots (start_time, end_time, type) VALUES (?, ?, ?)',
        [startTime, endTime, type]
    );
    return insertResult.insertId;
}

/** Tạo sân mới: name, province, ward, address, desc, ảnh (upload hoặc URL), slot. */
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
        if (typeof slots === 'string') {
            try {
                slots = JSON.parse(slots);
            } catch {
                slots = [];
            }
        }
        if (!Array.isArray(slots)) slots = [];

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((f) => '/uploads/' + f.filename);
        } else if (Array.isArray(body.images)) {
            imageUrls = body.images.filter((u) => u && String(u).trim());
        }

        if (!clerk_user_id || !field_name || !province || !ward || !street_address) {
            return res.status(400).json({
                message: 'Thiếu thông tin: clerk_user_id, field_name, province, ward, street_address'
            });
        }

        const [users] = await db.query(
            'SELECT id, name FROM users WHERE clerk_user_id = ? AND role = ?',
            [clerk_user_id, 'owner']
        );
        if (users.length === 0) {
            return res.status(403).json({ message: 'Chỉ chủ sân mới được tạo sân.' });
        }
        const userId = users[0].id;
        const ownerName = users[0].name || 'Chủ sân';
        const [ownerRows] = await db.query('SELECT id FROM owners WHERE user_id = ?', [userId]);
        let ownerId;
        if (ownerRows.length === 0) {
            const [insertOwner] = await db.query(
                'INSERT INTO owners (user_id, owner_name, phone) VALUES (?, ?, ?)',
                [userId, ownerName, '']
            );
            ownerId = insertOwner.insertId;
        } else {
            ownerId = ownerRows[0].id;
        }

        const districtVal = district || '';

        const [insertField] = await db.query(
            'INSERT INTO fields (field_name, province, district, ward, street_address, description, owner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [field_name, province, districtVal, ward, street_address, description || null, ownerId, 'active']
        );
        const fieldId = insertField.insertId;

        for (let i = 0; i < imageUrls.length; i++) {
            const url = String(imageUrls[i]).trim();
            if (!url) continue;
            await db.query(
                'INSERT INTO field_images (field_id, image_url, is_primary) VALUES (?, ?, ?)',
                [fieldId, url, i === 0 ? 1 : 0]
            );
        }

        const slotList = slots;
        for (const slot of slotList) {
            const startTime = slot.start_time || slot.startTime;
            const endTime = slot.end_time || slot.endTime;
            const type = (slot.type === 'peak' ? 'peak' : 'normal');
            const price = Number(slot.price);
            if (!startTime || !endTime || !Number.isFinite(price) || price < 0) continue;
            const timeSlotId = await getOrCreateTimeSlot(startTime, endTime, type);
            await db.query(
                'INSERT INTO field_prices (field_id, time_slot_id, price) VALUES (?, ?, ?)',
                [fieldId, timeSlotId, price]
            );
        }

        res.status(201).json({ message: 'Tạo sân thành công.', fieldId });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};
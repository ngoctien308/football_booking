import { db } from "../config/db.js";

export const getAllFields = async (req, res) => {
    try {
        const [fieldRows] = await db.query('SELECT * FROM fields');
        res.status(200).json({ fields: fieldRows });
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
            'SELECT id, field_name, province, district, ward, street_address, description, status, created_at FROM fields WHERE owner_id = ? ORDER BY created_at DESC',
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
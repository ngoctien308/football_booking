import { db } from "../config/db.js";

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

export const getServicesByField = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const { data: services, error } = await db
            .from("field_services")
            .select("*")
            .eq("field_id", fieldId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            services: services || [],
        });
    } catch (err) {
        console.error("Error fetching services:", err);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách dịch vụ." });
    }
};

export const createService = async (req, res) => {
    try {
        const { clerk_user_id, field_id, service_name, description, price, quantity_available, unit } = req.body;

        if (!clerk_user_id || !field_id || !service_name || price === undefined) {
            return res.status(400).json({ message: "Thông tin dịch vụ không đầy đủ." });
        }

        const ownerInfo = await getOwnerFromClerk(clerk_user_id);
        if (!ownerInfo) {
            return res.status(401).json({ message: "Bạn không có quyền thực hiện hành động này." });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("id, owner_id")
            .eq("id", field_id)
            .maybeSingle();

        if (fieldError) throw fieldError;
        if (!field || field.owner_id !== ownerInfo.ownerId) {
            return res.status(403).json({ message: "Sân này không thuộc về bạn." });
        }

        const { data: service, error: createError } = await db
            .from("field_services")
            .insert({
                field_id,
                service_name,
                description: description || null,
                price: parseFloat(price),
                quantity_available: quantity_available ? parseInt(quantity_available) : 1,
                unit: unit || null,
                status: "active",
            })
            .select()
            .single();

        if (createError) throw createError;

        return res.status(201).json({
            success: true,
            message: "Dịch vụ được tạo thành công.",
            service,
        });
    } catch (err) {
        console.error("Error creating service:", err);
        return res.status(500).json({ message: "Lỗi khi tạo dịch vụ." });
    }
};

export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { clerk_user_id, service_name, description, price, quantity_available, unit, status } = req.body;

        if (!clerk_user_id) {
            return res.status(400).json({ message: "Thiếu clerk_user_id." });
        }

        const ownerInfo = await getOwnerFromClerk(clerk_user_id);
        if (!ownerInfo) {
            return res.status(401).json({ message: "Bạn không có quyền thực hiện hành động này." });
        }

        const { data: service, error: fetchError } = await db
            .from("field_services")
            .select("*, field_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!service) {
            return res.status(404).json({ message: "Dịch vụ không tồn tại." });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("owner_id")
            .eq("id", service.field_id)
            .maybeSingle();

        if (fieldError) throw fieldError;
        if (!field || field.owner_id !== ownerInfo.ownerId) {
            return res.status(403).json({ message: "Bạn không có quyền cập nhật dịch vụ này." });
        }

        const updateData = {};
        if (service_name !== undefined) updateData.service_name = service_name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (quantity_available !== undefined) updateData.quantity_available = parseInt(quantity_available);
        if (unit !== undefined) updateData.unit = unit;
        if (status !== undefined) updateData.status = status;
        updateData.updated_at = new Date().toISOString();

        const { data: updated, error: updateError } = await db
            .from("field_services")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: "Dịch vụ được cập nhật thành công.",
            service: updated,
        });
    } catch (err) {
        console.error("Error updating service:", err);
        return res.status(500).json({ message: "Lỗi khi cập nhật dịch vụ." });
    }
};

export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const { clerk_user_id } = req.body;

        if (!clerk_user_id) {
            return res.status(400).json({ message: "Thiếu clerk_user_id." });
        }

        const ownerInfo = await getOwnerFromClerk(clerk_user_id);
        if (!ownerInfo) {
            return res.status(401).json({ message: "Bạn không có quyền thực hiện hành động này." });
        }

        const { data: service, error: fetchError } = await db
            .from("field_services")
            .select("*, field_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!service) {
            return res.status(404).json({ message: "Dịch vụ không tồn tại." });
        }

        const { data: field, error: fieldError } = await db
            .from("fields")
            .select("owner_id")
            .eq("id", service.field_id)
            .maybeSingle();

        if (fieldError) throw fieldError;
        if (!field || field.owner_id !== ownerInfo.ownerId) {
            return res.status(403).json({ message: "Bạn không có quyền xóa dịch vụ này." });
        }

        const { error: deleteError } = await db
            .from("field_services")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        return res.status(200).json({
            success: true,
            message: "Dịch vụ được xóa thành công.",
        });
    } catch (err) {
        console.error("Error deleting service:", err);
        return res.status(500).json({ message: "Lỗi khi xóa dịch vụ." });
    }
};

export const getOwnerServices = async (req, res) => {
    try {
        const { clerk_user_id } = req.query;

        if (!clerk_user_id) {
            return res.status(400).json({ message: "Thiếu clerk_user_id." });
        }

        const ownerInfo = await getOwnerFromClerk(clerk_user_id);
        if (!ownerInfo) {
            return res.status(401).json({ message: "Bạn không có quyền thực hiện hành động này." });
        }

        const { data: services, error } = await db
            .from("field_services")
            .select("*, field_id, fields(id, field_name)")
            .eq("fields.owner_id", ownerInfo.ownerId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            services: services || [],
        });
    } catch (err) {
        console.error("Error fetching owner services:", err);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách dịch vụ." });
    }
};

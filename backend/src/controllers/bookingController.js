import { db } from "../config/db.js";
import { stripe } from "../config/stripe.js";

const ACTIVE_BOOKING_STATUSES = ["pending", "approved"];
const NORMAL_PRICE = 500000;
const PEAK_PRICE = 900000;

const toDateString = (input) => {
    if (!input) return new Date().toISOString().slice(0, 10);
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
};

// Helper to generate default slots 6h-23h (1.5h per slot)
const getDefaultSlots = () => {
    const slots = [];
    let startHour = 6;
    let startMin = 0;
    
    // 6:00 to 22:30 (last slot ends at 24:00 but we cap at 23:00 or similar)
    // 1.5h = 90 mins. 
    // Slots: 6:00-7:30, 7:30-9:00, 9:00-10:30, 10:30-12:00, 12:00-13:30, 13:30-15:00, 15:00-16:30, 16:30-18:00, 18:00-19:30, 19:30-21:00, 21:00-22:30
    for (let i = 0; i < 11; i++) {
        const totalStartMin = startHour * 60 + startMin + (i * 90);
        const h1 = Math.floor(totalStartMin / 60);
        const m1 = totalStartMin % 60;
        
        const totalEndMin = totalStartMin + 90;
        const h2 = Math.floor(totalEndMin / 60);
        const m2 = totalEndMin % 60;

        if (h1 >= 23) break;

        const startTime = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}:00`;
        const endTime = `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}:00`;
        
        // Peak hours: 17h-19h. If slot overlaps with 17:00-19:00, it's peak.
        // Simplified: 16:30-18:00 and 18:00-19:30 are peak
        const isPeak = (h1 === 16 && m1 === 30) || (h1 === 18 && m1 === 0);
        
        slots.push({
            id: i + 1, // Virtual ID for frontend
            start_time: startTime,
            end_time: endTime,
            type: isPeak ? "peak" : "normal",
            price: isPeak ? PEAK_PRICE : NORMAL_PRICE
        });
    }
    return slots;
};

async function getCustomerByClerkId(clerkUserId) {
    const { data, error } = await db
        .from("users")
        .select("id, role, name")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return { error: "NOT_FOUND" };
    if (data.role !== "customer") return { error: "NOT_CUSTOMER" };
    return data;
}

async function getOwnerByClerkId(clerkUserId) {
    const { data: user, error: userError } = await db
        .from("users")
        .select("id, role")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

    if (userError) throw userError;
    if (!user) return { error: "NOT_FOUND" };
    if (user.role !== "owner") return { error: "NOT_OWNER" };

    const { data: owner, error: ownerError } = await db
        .from("owners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (ownerError) throw ownerError;
    if (!owner) return { error: "OWNER_PROFILE_NOT_FOUND" };
    return owner;
}

export const getFieldAvailability = async (req, res) => {
    try {
        const fieldId = Number(req.params.field_id);
        const bookingDate = toDateString(req.query.booking_date);

        if (!Number.isFinite(fieldId) || !bookingDate) {
            return res.status(400).json({ message: "Invalid field_id or booking_date" });
        }

        const defaultSlots = getDefaultSlots();

        const { data: bookedRows, error: bookedError } = await db
                    .from("bookings")
            .select("start_time")
                    .eq("field_id", fieldId)
                    .eq("booking_date", bookingDate)
            .in("status", ACTIVE_BOOKING_STATUSES);

        if (bookedError) throw bookedError;

        const bookedStartTimes = new Set((bookedRows || []).map((item) => item.start_time));

        const slots = defaultSlots.map(slot => ({
            ...slot,
            is_available: !bookedStartTimes.has(slot.start_time)
        }));

        return res.status(200).json({ booking_date: bookingDate, slots });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading availability", error: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const {
            clerk_user_id,
            field_id,
            booking_date,
            slots, // Now passing slot objects instead of IDs
            contact_name,
            contact_phone,
            note,
        } = req.body || {};

        const fieldId = Number(field_id);
        const bookingDate = toDateString(booking_date);
        const selectedSlots = Array.isArray(slots) ? slots : [];

        if (!clerk_user_id || !Number.isFinite(fieldId) || !bookingDate) {
            return res.status(400).json({ message: "Missing clerk_user_id, field_id, or booking_date" });
        }

        if (selectedSlots.length === 0) {
            return res.status(400).json({ message: "Please select at least one slot" });
        }

        if (!contact_phone || String(contact_phone).trim().length < 8) {
            return res.status(400).json({ message: "Invalid contact phone" });
        }

        const customer = await getCustomerByClerkId(clerk_user_id);
        if (customer.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (customer.error === "NOT_CUSTOMER") return res.status(403).json({ message: "Only customers can book" });

        const { data: field, error: fieldError } = await db.from("fields").select("id").eq("id", fieldId).maybeSingle();
        if (fieldError) throw fieldError;
        if (!field) return res.status(404).json({ message: "Field not found" });

        const selectedStartTimes = selectedSlots.map(s => s.start_time);

        const { data: bookedRows, error: bookedError } = await db
            .from("bookings")
            .select("start_time")
            .eq("field_id", fieldId)
            .eq("booking_date", bookingDate)
            .in("status", ACTIVE_BOOKING_STATUSES)
            .in("start_time", selectedStartTimes);
        if (bookedError) throw bookedError;

        if (bookedRows && bookedRows.length > 0) {
            return res.status(409).json({
                message: "Some slots are no longer available",
                unavailable_slots: bookedRows.map(r => r.start_time),
            });
        }

        const cleanedContactName = typeof contact_name === "string" ? contact_name.trim() : "";
        const cleanedNote = typeof note === "string" ? note.trim() : "";
        const finalNote =
            cleanedContactName.length > 0
                ? `${cleanedContactName}${cleanedNote ? ` | ${cleanedNote}` : ""}`
                : cleanedNote || null;

        const bookingRows = selectedSlots.map((slot) => ({
            customer_id: customer.id,
            field_id: fieldId,
            start_time: slot.start_time,
            end_time: slot.end_time,
            booking_date: bookingDate,
            contact_phone: String(contact_phone).trim(),
            note: finalNote,
            total_price: slot.price,
            payment_status: "unpaid",
            payment_method: null,
            paid_at: null,
            status: "pending",
        }));

        const { data: insertedRows, error: insertError } = await db
            .from("bookings")
            .insert(bookingRows)
            .select("id, field_id, start_time, end_time, booking_date, total_price, status, created_at");
        if (insertError) throw insertError;

        return res.status(201).json({
            message: "Booking created successfully and waiting for owner confirmation",
            bookings: insertedRows || [],
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while creating booking", error: error.message });
    }
};

export const getBookingsByCustomer = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;
        const fieldId = Number(req.query.field_id);

        const customer = await getCustomerByClerkId(clerk_user_id);
        if (customer.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (customer.error === "NOT_CUSTOMER") return res.status(403).json({ message: "Only customers can access bookings" });

        let query = db
            .from("bookings")
            .select("id, field_id, start_time, end_time, booking_date, contact_phone, note, total_price, status, payment_status, payment_method, paid_at, created_at")
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false });

        if (Number.isFinite(fieldId)) {
            query = query.eq("field_id", fieldId);
        }

        const { data: bookings, error: bookingError } = await query;
        if (bookingError) throw bookingError;

        if (!bookings || bookings.length === 0) {
            return res.status(200).json({ bookings: [] });
        }

        const fieldIds = [...new Set(bookings.map((b) => b.field_id))];
        let fieldMap = new Map();

        if (fieldIds.length > 0) {
            const { data: fields, error: fieldsError } = await db
                .from("fields")
                .select("id, field_name, address")
                .in("id", fieldIds);

            if (fieldsError) throw fieldsError;
            fieldMap = new Map((fields || []).map((f) => [f.id, f]));
        }

        const rows = bookings.map((booking) => ({
                ...booking,
            field: fieldMap.get(booking.field_id) || null,
        }));

        return res.status(200).json({ bookings: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading customer bookings", error: error.message });
    }
};

export const getBookingsByOwner = async (req, res) => {
    try {
        const { clerk_user_id } = req.params;
        const owner = await getOwnerByClerkId(clerk_user_id);

        if (owner.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (owner.error === "NOT_OWNER") return res.status(403).json({ message: "Only owners can access this endpoint" });
        if (owner.error === "OWNER_PROFILE_NOT_FOUND") return res.status(200).json({ bookings: [] });

        const { data: fields, error: fieldsError } = await db
            .from("fields")
            .select("id, field_name")
            .eq("owner_id", owner.id);
        if (fieldsError) throw fieldsError;

        const fieldIds = (fields || []).map((field) => field.id);
        if (fieldIds.length === 0) {
            return res.status(200).json({ bookings: [] });
        }

        const { data: bookings, error: bookingError } = await db
            .from("bookings")
            .select("id, customer_id, field_id, start_time, end_time, booking_date, contact_phone, note, total_price, status, payment_status, payment_method, paid_at, created_at")
            .in("field_id", fieldIds)
            .order("created_at", { ascending: false });
        if (bookingError) throw bookingError;

        const customerIds = [...new Set((bookings || []).map((row) => row.customer_id))];

        const { data: users, error: usersError } = customerIds.length > 0
            ? await db.from("users").select("id, name, email").in("id", customerIds)
            : { data: [], error: null };

        if (usersError) throw usersError;

        const fieldMap = new Map((fields || []).map((field) => [field.id, field]));
        const userMap = new Map((users || []).map((u) => [u.id, u]));

        const rows = (bookings || []).map((booking) => ({
            ...booking,
            field: fieldMap.get(booking.field_id) || null,
            customer: userMap.get(booking.customer_id) || null,
        }));

        return res.status(200).json({ bookings: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while loading owner bookings", error: error.message });
    }
};

export const updateBookingStatus = async (req, res) => {
    try {
        const bookingId = Number(req.params.id);
        const { clerk_user_id, status } = req.body || {};

        if (!Number.isFinite(bookingId) || !clerk_user_id || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Missing or invalid booking id, clerk_user_id, or status" });
        }

        const owner = await getOwnerByClerkId(clerk_user_id);
        if (owner.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (owner.error === "NOT_OWNER") return res.status(403).json({ message: "Only owners can update booking status" });
        if (owner.error === "OWNER_PROFILE_NOT_FOUND") return res.status(403).json({ message: "Owner profile not found" });

        const { data: booking, error: bookingError } = await db
            .from("bookings")
            .select("id, field_id, status, start_time, end_time, booking_date")
            .eq("id", bookingId)
            .maybeSingle();
        if (bookingError) throw bookingError;
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.status !== "pending") {
            return res.status(409).json({ message: "Only pending bookings can be updated" });
        }

        const { data: ownerField, error: fieldError } = await db
            .from("fields")
            .select("id")
            .eq("id", booking.field_id)
            .eq("owner_id", owner.id)
            .maybeSingle();
        if (fieldError) throw fieldError;
        if (!ownerField) return res.status(403).json({ message: "You cannot update this booking" });

        const { data: updated, error: updateError } = await db
            .from("bookings")
            .update({ status })
            .eq("id", bookingId)
            .select("id, field_id, start_time, end_time, booking_date, status, created_at")
            .maybeSingle();
        if (updateError) throw updateError;

        return res.status(200).json({
            message: "Booking status updated",
            booking: updated,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while updating booking status", error: error.message });
    }
};

export const payBooking = async (req, res) => {
    try {
        const bookingId = Number(req.params.id);
        const { clerk_user_id, payment_method } = req.body || {};

        if (!Number.isFinite(bookingId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid booking id or clerk_user_id" });
        }

        const customer = await getCustomerByClerkId(clerk_user_id);
        if (customer.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (customer.error === "NOT_CUSTOMER") return res.status(403).json({ message: "Only customers can pay for bookings" });

        const { data: booking, error: bookingError } = await db
            .from("bookings")
            .select("id, customer_id, status, payment_status")
            .eq("id", bookingId)
            .maybeSingle();
        if (bookingError) throw bookingError;
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.customer_id !== customer.id) {
            return res.status(403).json({ message: "You cannot pay for this booking" });
        }

        if (booking.status !== "approved") {
            return res.status(409).json({ message: "Booking must be approved by field owner before payment" });
        }

        if (booking.payment_status === "paid") {
            return res.status(409).json({ message: "Booking is already paid" });
        }

        const now = new Date().toISOString();

        const { data: updated, error: updateError } = await db
            .from("bookings")
            .update({
                payment_status: "paid",
                payment_method: payment_method || "mock",
                paid_at: now,
            })
            .eq("id", bookingId)
            .select("id, field_id, start_time, end_time, booking_date, total_price, status, payment_status, payment_method, paid_at, created_at")
            .maybeSingle();
        if (updateError) throw updateError;

        return res.status(200).json({
            message: "Payment simulated successfully",
            booking: updated,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while paying for booking", error: error.message });
    }
};

export const createStripeCheckoutSession = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ message: "Stripe is not configured on the server" });
        }

        const bookingId = Number(req.params.id);
        const { clerk_user_id } = req.body || {};

        if (!Number.isFinite(bookingId) || !clerk_user_id) {
            return res.status(400).json({ message: "Missing or invalid booking id or clerk_user_id" });
        }

        const customer = await getCustomerByClerkId(clerk_user_id);
        if (customer.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
        if (customer.error === "NOT_CUSTOMER") return res.status(403).json({ message: "Only customers can pay for bookings" });

        const { data: booking, error: bookingError } = await db
            .from("bookings")
            .select("id, customer_id, field_id, start_time, end_time, booking_date, total_price, status, payment_status")
            .eq("id", bookingId)
            .maybeSingle();
        if (bookingError) throw bookingError;
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.customer_id !== customer.id) {
            return res.status(403).json({ message: "You cannot pay for this booking" });
        }

        if (booking.status !== "approved") {
            return res.status(409).json({ message: "Booking must be approved by field owner before payment" });
        }

        if (booking.payment_status === "paid") {
            return res.status(409).json({ message: "Booking is already paid" });
        }

        const amount = Math.round(Number(booking.total_price || 0));
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: "Invalid booking price" });
        }

        const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "vnd",
                        product_data: {
                            name: `Đặt sân #${booking.id}`,
                            description: `Ngày ${booking.booking_date} | ${String(booking.start_time).slice(0, 5)} - ${String(
                                booking.end_time
                            ).slice(0, 5)}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${FRONTEND_BASE_URL}/customers/bookings?payment=success&booking_id=${booking.id}`,
            cancel_url: `${FRONTEND_BASE_URL}/customers/bookings?payment=cancel&booking_id=${booking.id}`,
            metadata: {
                booking_id: String(booking.id),
                customer_id: String(customer.id),
            },
        });

        return res.status(200).json({
            url: session.url,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error while creating Stripe checkout session", error: error.message });
    }
};


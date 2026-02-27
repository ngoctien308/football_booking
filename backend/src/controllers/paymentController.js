import Stripe from "stripe";
import { db } from "../config/db.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

async function getCustomerByClerkId(clerkUserId) {
  const { data, error } = await db
    .from("users")
    .select("id, role, email, name")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: "NOT_FOUND" };
  if (data.role !== "customer") return { error: "NOT_CUSTOMER" };
  return data;
}

export const createStripeCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured. Missing STRIPE_SECRET_KEY" });
    }

    const bookingId = Number(req.params.id);
    const { clerk_user_id } = req.body || {};

    if (!Number.isFinite(bookingId) || !clerk_user_id) {
      return res.status(400).json({ message: "Missing or invalid booking id or clerk_user_id" });
    }

    const customer = await getCustomerByClerkId(clerk_user_id);
    if (customer.error === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
    if (customer.error === "NOT_CUSTOMER") return res.status(403).json({ message: "Only customers can pay" });

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id, customer_id, field_id, booking_date, start_time, end_time, total_price, status, payment_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.customer_id !== customer.id) return res.status(403).json({ message: "You cannot pay this booking" });
    if (booking.status !== "approved") {
      return res.status(409).json({ message: "Booking must be approved by owner before payment" });
    }
    if (booking.payment_status === "paid") {
      return res.status(409).json({ message: "Booking already paid" });
    }

    const amount = Math.max(Math.round(Number(booking.total_price || 0)), 0);
    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid booking amount" });
    }

    const successUrl = `${appBaseUrl}/customers/bookings?payment=success`;
    const cancelUrl = `${appBaseUrl}/customers/bookings?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "vnd",
            unit_amount: amount,
            product_data: {
              name: `Thanh toán đặt sân #${booking.id}`,
              description: `${booking.booking_date} ${String(booking.start_time).slice(0, 5)}-${String(booking.end_time).slice(0, 5)}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_id: String(booking.id),
        customer_id: String(customer.id),
      },
    });

    return res.status(200).json({ checkout_url: session.url, session_id: session.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while creating Stripe checkout", error: error.message });
  }
};

export const handleStripeWebhook = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send("Stripe not configured");
    }
    if (!stripeWebhookSecret) {
      return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
    }

    const signature = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = Number(session?.metadata?.booking_id);

      if (Number.isFinite(bookingId)) {
        const now = new Date().toISOString();
        const { error } = await db
          .from("bookings")
          .update({
            payment_status: "paid",
            payment_method: "stripe",
            paid_at: now,
          })
          .eq("id", bookingId)
          .eq("status", "approved")
          .neq("payment_status", "paid");

        if (error) {
          console.error("Failed to update booking payment from webhook", error);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Webhook handler failed");
  }
};

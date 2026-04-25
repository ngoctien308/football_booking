import express from "express";
import {
    createBooking,
    getBookingsByCustomer,
    getBookingsByOwner,
    getOwnerDashboardStats,
    getFieldAvailability,
    updateBookingStatus,
    payBooking,
    createStripeCheckoutSession,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/availability/:field_id", getFieldAvailability);
router.post("/", createBooking);
router.get("/customer/:clerk_user_id", getBookingsByCustomer);
router.get("/owner/:clerk_user_id", getBookingsByOwner);
router.get("/owner/:clerk_user_id/stats", getOwnerDashboardStats);
router.patch("/:id/status", updateBookingStatus);
router.patch("/:id/pay", payBooking);
router.post("/:id/checkout", createStripeCheckoutSession);

export default router;

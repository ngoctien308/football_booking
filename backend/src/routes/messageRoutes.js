import express from "express";
import {
    getOrCreateConversationByField,
    listConversationsForCustomer,
    listConversationsForOwner,
    listMessages,
    sendMessage,
} from "../controllers/messageController.js";

const router = express.Router();

// Customer starts chat from a field
router.post("/conversations/by-field", getOrCreateConversationByField);

// List conversations
router.get("/conversations/customer/:clerk_user_id", listConversationsForCustomer);
router.get("/conversations/owner/:clerk_user_id", listConversationsForOwner);

// Messages
router.get("/:conversation_id", listMessages);
router.post("/:conversation_id", sendMessage);

export default router;


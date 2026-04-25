import express from "express";
import { approveOwner, deleteAccount, listAccounts, setAccountLock, adminLogin, adminMe } from "../controllers/adminController.js";
import { requireAdminToken } from "../middleware/adminAuth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/me", requireAdminToken, adminMe);

router.get("/accounts", requireAdminToken, listAccounts);
router.patch("/accounts/:id/approve-owner", requireAdminToken, approveOwner);
router.patch("/accounts/:id/lock", requireAdminToken, setAccountLock);
router.delete("/accounts/:id", requireAdminToken, deleteAccount);

export default router;

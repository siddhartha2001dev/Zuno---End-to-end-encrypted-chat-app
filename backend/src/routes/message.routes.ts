import { Router } from "express";
import { messageController } from "../controllers/message.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

// Conversation messages history, sending fallback, and read status
router.get("/conversations/:conversationId/messages", messageController.getMessages);
router.post("/conversations/:conversationId/messages", messageController.sendMessage);
router.post("/conversations/:conversationId/read", messageController.markAsRead);

// Direct message operations
router.patch("/messages/:messageId", messageController.editMessage);
router.delete("/messages/:messageId", messageController.deleteMessage);
router.post("/messages/:messageId/reactions", messageController.addReaction);
router.delete("/messages/:messageId/reactions", messageController.removeReaction);

export default router;

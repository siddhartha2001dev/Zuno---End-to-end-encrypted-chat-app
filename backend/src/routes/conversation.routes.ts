import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/", conversationController.list);
router.post("/direct", conversationController.createDirect);
router.post("/group", conversationController.createGroup);
router.delete("/all", conversationController.deleteAll);
router.get("/:id", conversationController.getById);
router.patch("/:id", conversationController.updateGroup);
router.delete("/:id", conversationController.deleteConversation);
router.post("/:id/members", conversationController.addMember);
router.delete("/:id/members/:userId", conversationController.removeMember);

export default router;

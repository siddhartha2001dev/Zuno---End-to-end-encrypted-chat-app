import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadAvatar, handleUploadErrors } from "../middleware/upload.middleware.js";

const router = Router();

// Public route — no auth required (used during registration)
router.get("/check-chat-id", userController.checkChatId);

router.use(authenticateToken);
router.post(
  "/avatar",
  uploadAvatar.single("avatar"),
  handleUploadErrors,
  userController.uploadAvatar
);
router.put("/avatar", userController.setAvatarPreset);
router.delete("/avatar", userController.removeAvatar);
router.post("/deactivate", userController.deactivate);
router.put("/name", userController.updateName);
router.put("/public-key", userController.updatePublicKey);
router.get("/search", userController.search);
router.get("/:id/public-key", userController.getPublicKey);
router.get("/:id", userController.profile);

export default router;

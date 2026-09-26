import { Router } from "express";
import { uploadController } from "../controllers/upload.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadMedia, handleUploadErrors } from "../middleware/upload.middleware.js";

const router = Router();

router.use(authenticateToken);

router.post(
  "/media",
  uploadMedia.single("file"),
  handleUploadErrors,
  uploadController.uploadMedia
);

export default router;

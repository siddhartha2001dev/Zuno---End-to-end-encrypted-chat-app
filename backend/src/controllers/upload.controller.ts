import { Request, Response, NextFunction } from "express";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { AppError } from "../middleware/error.middleware.js";

export class UploadController {
  uploadMedia = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError("No file uploaded", 400);
      }

      const file = req.file;
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      const isAudio = file.mimetype.startsWith("audio/");

      // Choose appropriate folder and options for Cloudinary
      const folder = isImage
        ? "zuno_chat/media/images"
        : isVideo
        ? "zuno_chat/media/videos"
        : isAudio
        ? "zuno_chat/media/audio"
        : "zuno_chat/media/files";

      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder,
        resource_type: "auto",
        public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      });

      const messageType: "image" | "file" | "audio" = isImage
        ? "image"
        : isAudio
        ? "audio"
        : "file";

      res.status(200).json({
        success: true,
        mediaUrl: uploadResult.secureUrl,
        fileName: file.originalname,
        fileSize: file.size,
        format: uploadResult.format,
        resourceType: uploadResult.resourceType,
        messageType,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const uploadController = new UploadController();

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
      const isAudio =
        file.mimetype.startsWith("audio/") ||
        /\.(webm|ogg|mp3|wav|m4a|aac|opus)$/i.test(file.originalname);

      // Choose appropriate folder and options for Cloudinary
      const folder = isImage
        ? "zuno_chat/media/images"
        : isVideo
        ? "zuno_chat/media/videos"
        : isAudio
        ? "zuno_chat/media/audio"
        : "zuno_chat/media/files";

      // Strip extension from public_id so Cloudinary handles format cleanly without double extension
      const nameWithoutExt = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      const public_id = `${Date.now()}_${nameWithoutExt}`;

      // Audio files in Cloudinary must use resource_type: "video"
      const resource_type = isAudio || isVideo ? "video" : isImage ? "image" : "auto";

      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder,
        resource_type,
        public_id,
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

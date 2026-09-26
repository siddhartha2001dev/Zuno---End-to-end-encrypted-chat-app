import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./error.middleware.js";

// Use memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

// Allowed MIME types for profile avatars
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// File filter for avatar uploads (images only)
const avatarFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_AVATAR_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file format for avatar. Only JPG, PNG, WEBP, and GIF images are allowed.",
        400
      )
    );
  }
};

// 1. Multer instance for avatar uploads (max 5 MB)
export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: avatarFileFilter,
});

// 2. Multer instance for chat media attachments (images, videos, audio, documents up to 25 MB)
export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

// Helper middleware to handle Multer upload errors gracefully
export function handleUploadErrors(
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("File size exceeds the allowable limit.", 400));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  } else if (err) {
    return next(err);
  }
  next();
}

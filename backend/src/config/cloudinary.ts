import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from "cloudinary";
import { env } from "./env.js";
import { AppError } from "../middleware/error.middleware.js";

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_KEY !== "your_api_key" &&
    env.CLOUDINARY_API_SECRET &&
    env.CLOUDINARY_API_SECRET !== "your_api_secret"
  );
};

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
}

/**
 * Uploads an in-memory buffer to Cloudinary using upload_stream.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions = {}
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env",
      500
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "zuno_chat",
        resource_type: "auto",
        ...options,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new AppError(
              `Cloudinary upload failed: ${error?.message || "Unknown error"}`,
              500
            )
          );
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;

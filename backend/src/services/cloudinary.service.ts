import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export const cloudinaryService = {
  upload: async (filePath: string, folder: string): Promise<string> => {
    const response = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto"
    });
    return response.secure_url;
  },
  uploadBuffer: async (buffer: Buffer, folder: string, publicId: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "raw"
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result?.secure_url ?? "");
        }
      );
      stream.end(buffer);
    })
};

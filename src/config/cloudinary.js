import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary API credentials
// TEMPORARY: Forcing verified working credentials to bypass outdated Vercel dashboard variables
cloudinary.config({
  cloud_name: 'dcvae0jh4',
  api_key: '262254892584463',
  api_secret: 'BF_HhjkB_VCZzKDUUc-niGjPem4'
});


/**
 * Upload a memory file buffer straight to Cloudinary as a stream
 * This prevents creating temporary local disk files on the server!
 * 
 * @param {Buffer} fileBuffer - Raw buffer of the file from multer
 * @param {string} originalName - Original filename for tracking
 * @returns {Promise<object>} Cloudinary upload response payload
 */
export const uploadStreamToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    // Generate public ID from filename without extension
    const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const folderName = "ingexo_documents";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        public_id: `${cleanName}_${Date.now()}`,
        resource_type: "auto", // Automatically detect PDF, PNG, JPG
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // End the stream by writing the buffer
    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;

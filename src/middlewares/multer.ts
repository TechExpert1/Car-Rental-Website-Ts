import multer, { FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import s3 from "../config/awsConfig";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?:
        | { [fieldname: string]: Express.Multer.File[] }
        | Express.Multer.File[];
      imageUrl?: string;
      fileUrl?: string;
      fileUrls?: { [fieldname: string]: string[] };
      imageUrls?: { [fieldname: string]: string[] };
    }
  }
}

const uploadPath = path.resolve("./temp-uploads");
fs.mkdirSync(uploadPath, { recursive: true });

// Cleanup old temp files on startup and periodically
const cleanupOldTempFiles = () => {
  try {
    const files = fs.readdirSync(uploadPath);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    files.forEach((file) => {
      const filePath = path.join(uploadPath, file);
      const stat = fs.statSync(filePath);
      const age = now - stat.mtimeMs;

      if (age > maxAge) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up old temp file: ${file} (age: ${Math.round(age / 1000)}s)`);
        } catch (err) {
          console.error(`Failed to cleanup temp file ${file}:`, err);
        }
      }
    });
  } catch (err) {
    console.error("Error during temp file cleanup:", err);
  }
};

// Run cleanup on startup
cleanupOldTempFiles();

// Run cleanup every 30 minutes
setInterval(cleanupOldTempFiles, 30 * 60 * 1000);

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => cb(null, uploadPath),
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => cb(null, Date.now() + "-" + file.originalname),
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Accept all file types
  cb(null, true);
};

export const multerUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter,
});

export const uploadSingleToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Handle .any() middleware - get first file from files array
    const files = req.files as Express.Multer.File[];
    const file = files && files.length > 0 ? files[0] : req.file;

    if (!file) {
      req.file = undefined;
      req.files = undefined;
      return next();
    }

    const fileContent = fs.readFileSync(file.path);
    const fileName = `uploads/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileName,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    
    // Cleanup temp file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`✅ Cleaned up temp file: ${file.path}`);
      }
    } catch (unlinkErr) {
      console.error(`❌ Failed to delete temp file ${file.path}:`, unlinkErr);
    }

    req.fileUrl = fileUrl;
    req.files = undefined;
    next();
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Upload failed",
    });
  }
};

export const newMulterUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
}).any();

export const uploadMultipleToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      req.fileUrls = {};
      // Clean up: reset files array to prevent accumulation
      req.files = undefined;
      return next();
    }

    const fileUrls: { [fieldname: string]: string[] } = {};
    const failedFiles: string[] = [];

    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file.path);
        const fileName = `uploads/${Date.now()}-${Math.random()}-${file.originalname}`;

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: fileName,
          Body: fileContent,
          ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        if (!fileUrls[file.fieldname]) {
          fileUrls[file.fieldname] = [];
        }
        fileUrls[file.fieldname].push(fileUrl);

        console.log(`✅ Uploaded: ${file.fieldname}/${file.originalname}`);
      } catch (fileErr) {
        console.error(`❌ Failed to upload file ${file.originalname}:`, fileErr);
        failedFiles.push(file.originalname);
      } finally {
        // ALWAYS cleanup temp file - use finally to guarantee execution
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`✅ Cleaned up temp file: ${file.path}`);
          }
        } catch (unlinkErr) {
          console.error(`❌ Failed to delete temp file ${file.path}:`, unlinkErr);
        }
      }
    }

    // Set fileUrls even if empty
    req.fileUrls = fileUrls;
    
    // Clean up the files array to prevent memory leaks on 3rd+ requests
    req.files = undefined;

    // Log summary
    if (failedFiles.length > 0) {
      console.warn(`⚠️ uploadMultipleToS3: ${failedFiles.length} file(s) failed: ${failedFiles.join(", ")}`);
    } else {
      console.log(`✅ uploadMultipleToS3: All ${Object.keys(fileUrls).length} files uploaded successfully`);
    }

    return next();
  } catch (err) {
    console.error("💥 uploadMultipleToS3: Critical error", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    
    // Clean up files array on critical error too
    req.files = undefined;
    
    return next(err);
  }
};

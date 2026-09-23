import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";

export const PORTFOLIO_DIR = join(process.cwd(), "uploads", "portfolio");

type UploadFile = { originalname?: string; mimetype: string };

const IMAGE = /^image\/(jpeg|png|webp|jpg)$/i;
const VIDEO = /^video\/(mp4|webm|quicktime)$/i;

function extensionFor(file: UploadFile): string {
  const ext = extname(file.originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"].includes(ext)) {
    return ext;
  }
  if (IMAGE.test(file.mimetype)) {
    if (file.mimetype.includes("png")) {
      return ".png";
    }
    if (file.mimetype.includes("webp")) {
      return ".webp";
    }
    return ".jpg";
  }
  if (file.mimetype.includes("webm")) {
    return ".webm";
  }
  if (file.mimetype.includes("quicktime")) {
    return ".mov";
  }
  return ".mp4";
}

export const portfolioUpload = {
  storage: diskStorage({
    destination: (_req: unknown, _file: UploadFile, cb: (error: Error | null, destination: string) => void) => {
      if (!existsSync(PORTFOLIO_DIR)) {
        mkdirSync(PORTFOLIO_DIR, { recursive: true });
      }
      cb(null, PORTFOLIO_DIR);
    },
    filename: (_req: unknown, file: UploadFile, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extensionFor(file)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: UploadFile,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (IMAGE.test(file.mimetype) || VIDEO.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException("الملف لازم يكون صورة JPG أو PNG أو فيديو MP4"), false);
  },
};

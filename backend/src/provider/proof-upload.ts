import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";

export const PROOF_DIR = join(process.cwd(), "uploads", "proofs");

type UploadFile = { originalname?: string; mimetype: string };

const IMAGE = /^image\/(jpeg|png|webp|jpg)$/i;
const PDF = /^application\/pdf$/i;

function extensionFor(file: UploadFile): string {
  const ext = extname(file.originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  if (PDF.test(file.mimetype)) {
    return ".pdf";
  }
  if (file.mimetype.includes("png")) {
    return ".png";
  }
  if (file.mimetype.includes("webp")) {
    return ".webp";
  }
  return ".jpg";
}

export const proofUpload = {
  storage: diskStorage({
    destination: (_req: unknown, _file: UploadFile, cb: (error: Error | null, destination: string) => void) => {
      if (!existsSync(PROOF_DIR)) {
        mkdirSync(PROOF_DIR, { recursive: true });
      }
      cb(null, PROOF_DIR);
    },
    filename: (_req: unknown, file: UploadFile, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extensionFor(file)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: UploadFile,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (IMAGE.test(file.mimetype) || PDF.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException("الإيصال لازم يكون صورة JPG أو PNG أو ملف PDF"), false);
  },
};

import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";

export const CATALOG_DIR = join(process.cwd(), "uploads", "catalog");

type UploadFile = { originalname?: string; mimetype: string };

export const catalogUpload = {
  storage: diskStorage({
    destination: (_req: unknown, _file: UploadFile, cb: (error: Error | null, destination: string) => void) => {
      if (!existsSync(CATALOG_DIR)) {
        mkdirSync(CATALOG_DIR, { recursive: true });
      }
      cb(null, CATALOG_DIR);
    },
    filename: (_req: unknown, file: UploadFile, cb: (error: Error | null, filename: string) => void) => {
      const ext = extname(file.originalname || "").toLowerCase() || ".jpg";
      const safe = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
      cb(null, `${randomUUID()}${safe}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: UploadFile,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.mimetype)) {
      cb(new BadRequestException("الصورة لازم تكون JPG أو PNG"), false);
      return;
    }
    cb(null, true);
  },
};

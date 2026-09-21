import { Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { spawn } from "child_process";
import { join } from "path";

@Controller("setup")
export class SetupController {
  @Post("database")
  async database(@Headers("x-setup-key") key?: string) {
    const secret = process.env.SETUP_SECRET;
    if (!secret || key !== secret) {
      throw new UnauthorizedException("مفتاح الإعداد غير صحيح");
    }

    const { applySchema } = require(join(process.cwd(), "scripts", "apply-schema.cjs")) as {
      applySchema: () => Promise<{ created: boolean; message: string }>;
    };
    const schema = await applySchema();
    const seed = await this.runSeed();
    return { ok: true, schema, seed };
  }

  private runSeed() {
    return new Promise<{ ok: boolean; output: string }>((resolve, reject) => {
      const child = spawn("npx", ["tsx", "prisma/seed.ts"], {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
      });
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        output += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve({ ok: true, output: output.trim() });
          return;
        }
        reject(new Error(output || `seed failed with code ${code}`));
      });
    });
  }
}

import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { applyDatabaseUrl } from "./database-url";

async function bootstrap() {
  applyDatabaseUrl();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });
  app.setGlobalPrefix("api");
  const origins = new Set(
    [
      "http://localhost:4200",
      "https://webonothti.dalia-adel.com",
      "https://onotht.dalia-adel.com",
      ...(process.env.FRONTEND_URL ?? "").split(","),
    ]
      .map((item) => item.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const incoming = origin?.replace(/\/$/, "") ?? "";
      const localDev = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      callback(null, localDev || origins.has(incoming));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle("أنوثتي API")
    .setDescription("أساس Backend لمنصة أنوثتي")
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Onothiti API port ${port}`);
}

bootstrap();

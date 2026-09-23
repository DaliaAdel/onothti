import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { applyDatabaseUrl } from "./database-url";

async function bootstrap() {
  applyDatabaseUrl();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const origins = (process.env.FRONTEND_URL ?? "http://localhost:4200")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      const localDev = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      callback(null, localDev || origins.includes(origin));
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

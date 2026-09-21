import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export function applyDatabaseUrl() {
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  if (!user || !database) {
    return;
  }

  const password = process.env.MYSQL_PASSWORD ?? "";
  const host = mysqlHost();
  const port = process.env.MYSQL_PORT || "3306";
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  const ssl = process.env.MYSQL_SSL === "true" ? "?sslaccept=strict" : "";
  process.env.DATABASE_URL = `mysql://${auth}@${host}:${port}/${database}${ssl}`;
}

export function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

export function createMariaAdapter() {
  applyDatabaseUrl();
  return new PrismaMariaDb({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 5,
    connectTimeout: 8,
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

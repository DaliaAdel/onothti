const { execSync } = require("child_process");
require("dotenv").config();

const user = process.env.MYSQL_USER;
const database = process.env.MYSQL_DATABASE;
if (user && database) {
  const password = process.env.MYSQL_PASSWORD ?? "";
  const hostRaw = process.env.MYSQL_HOST || "localhost";
  const host = hostRaw === "localhost" ? "127.0.0.1" : hostRaw;
  const port = process.env.MYSQL_PORT || "3306";
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  const ssl = process.env.MYSQL_SSL === "true" ? "?sslaccept=strict" : "";
  process.env.DATABASE_URL = `mysql://${auth}@${host}:${port}/${database}${ssl}`;
}

execSync("npx prisma db push", { stdio: "inherit", env: process.env });
execSync("npx prisma db seed", { stdio: "inherit", env: process.env });

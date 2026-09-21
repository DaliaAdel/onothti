require("dotenv").config();
const { spawnSync } = require("child_process");
const { applySchema } = require("./apply-schema.cjs");

applySchema()
  .then((result) => {
    console.log(result.message);
    const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    process.exit(seed.status ?? 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

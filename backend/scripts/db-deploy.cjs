require("dotenv").config();
const { spawnSync } = require("child_process");
const { applySchema } = require("./apply-schema.cjs");

applySchema()
  .then((result) => {
    console.log(result.message);
    const align = spawnSync("node", ["scripts/apply-0003.cjs"], {
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    if (align.status) {
      process.exit(align.status);
    }
    for (const script of ["scripts/apply-0004.cjs", "scripts/apply-0005.cjs", "scripts/apply-0006.cjs"]) {
      const extra = spawnSync("node", [script], {
        stdio: "inherit",
        env: process.env,
        shell: true,
      });
      if (extra.status) {
        process.exit(extra.status);
      }
    }
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

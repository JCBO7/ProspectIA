import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/prospectai";

export default defineConfig({
  datasource: {
    url,
  },
});

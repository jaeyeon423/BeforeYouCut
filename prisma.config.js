import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});

import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import path from "path";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env so DATABASE_URL is available when running push locally
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const dbUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("NEON_DATABASE_URL (or DATABASE_URL) must be set");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});

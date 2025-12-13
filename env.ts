import path from "path";
import { config } from "dotenv";

export function loadEnv(env: string) {
  const envFilePath = path.resolve(__dirname, `.env.${env.toLowerCase()}`);
  config({ path: envFilePath, override: true });
}

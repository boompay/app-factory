import { AppInfo } from "../models";

export function validateAppInfo(app: AppInfo): void {
  if (!app.bearer_token) {
    throw new Error("App info missing bearer_token");
  }
  if (!app.refresh_token) {
    throw new Error("App info missing refresh_token");
  }
  if (!app.unit_id) {
    throw new Error("App info missing unit_id");
  }
}

export function validateRequiredEnv(): void {
  if (!process.env.BASE_URL) {
    throw new Error("BASE_URL environment variable is not set");
  }
}

export function validateApplicationToken(applicationToken: string | undefined): string {
  if (!applicationToken || applicationToken.trim() === "") {
    throw new Error("Application token is required");
  }
  return applicationToken;
}


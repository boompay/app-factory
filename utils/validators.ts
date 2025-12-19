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

/**
 * Extracts the BASE_URL from a magic link URL
 * @param link - The magic link URL
 * @returns The BASE_URL (e.g., https://api.staging.boompay.app)
 */
export function extractBaseUrlFromLink(link: string): string {
  try {
    const url = new URL(link);
    const hostname = url.hostname;
    
    // Replace 'screen' with 'api' in the hostname
    // Handles two patterns:
    // 1. screen.staging.boompay.app -> api.staging.boompay.app
    // 2. boompay-client-1837-screen.review.boompay.app -> boompay-client-1837-api.review.boompay.app
    const apiHostname = hostname.replace(/screen(?=\.)/, "api");
    
    // Construct the base URL with the same protocol
    return `${url.protocol}//${apiHostname}`;
  } catch (error) {
    throw new Error(`Invalid magic link URL: ${link}`);
  }
}


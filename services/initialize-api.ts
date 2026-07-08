import { ApiClient } from "./api-client";
import { AppInfo } from "../models";

export async function initializeApi(app: AppInfo): Promise<ApiClient> {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL environment variable is not set");
  }

  if (!app.bearer_token || !app.refresh_token) {
    throw new Error("App info is missing required tokens");
  }

  const api = new ApiClient(baseUrl, app.bearer_token, app.refresh_token);
  await api.init();

  return api;
}

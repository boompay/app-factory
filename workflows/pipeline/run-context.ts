import { ApiClient, AuthTokenProvider } from "../../services";
import { AppInfo } from "../../models";

export interface RunContext {
  api: ApiClient;
  app: AppInfo;
  tokenProvider: AuthTokenProvider;
  applicantIndex: number;
  magicLink: string;
}

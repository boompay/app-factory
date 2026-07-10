import { ApiClient, AuthTokenProvider } from "../services";
import { Applicant, AppInfo, getCurrentApplicant } from "../models";

export interface RunContext {
  api: ApiClient;
  app: AppInfo;
  tokenProvider: AuthTokenProvider;
  applicantIndex: number;
  magicLink: string;
}

export function getApplicant(ctx: RunContext): Applicant {
  const applicant = getCurrentApplicant(ctx.app, ctx.applicantIndex);
  if (!applicant) {
    throw new Error(`Applicant at index ${ctx.applicantIndex} not found`);
  }
  return applicant;
}

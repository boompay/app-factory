import { ApiClient, AuthTokenProvider } from "../services";
import { Applicant, AppInfo, getApplicantAt } from "../models";

export interface RunContext {
  api: ApiClient;
  app: AppInfo;
  tokenProvider: AuthTokenProvider;
  applicantIndex: number;
  magicLink: string;
}

export function getApplicant(ctx: RunContext): Applicant {
  const applicant = getApplicantAt(ctx.app, ctx.applicantIndex);
  if (!applicant) {
    throw new Error(`Applicant at index ${ctx.applicantIndex} not found`);
  }
  return applicant;
}

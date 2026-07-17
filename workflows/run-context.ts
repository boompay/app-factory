import { ApiClient, AuthTokenProvider } from "../services";
import { Applicant, AppInfo, getApplicantAt } from "../models";
import { Verification } from "../types";

export interface RunContext {
  api: ApiClient;
  /** Primary applicant API client — retained for co-applicant snapshots */
  primaryApi: ApiClient;
  app: AppInfo;
  tokenProvider: AuthTokenProvider;
  applicantIndex: number;
  magicLink: string;
  /** Verifications returned by the latest applicant-specific API response. */
  currentApplicantVerifications?: Verification[];
}

export function getApplicant(ctx: RunContext): Applicant {
  const applicant = getApplicantAt(ctx.app, ctx.applicantIndex);
  if (!applicant) {
    throw new Error(`Applicant at index ${ctx.applicantIndex} not found`);
  }
  return applicant;
}

export function isCoApplicantRun(ctx: RunContext): boolean {
  return ctx.applicantIndex > 0;
}

export function getSnapshotApi(ctx: RunContext): ApiClient {
  return isCoApplicantRun(ctx) ? ctx.primaryApi : ctx.api;
}

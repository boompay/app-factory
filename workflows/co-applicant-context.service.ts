import { ApiClient } from "../services";
import { Applicant } from "../models";
import { Verification } from "../types";
import { parseApplicantSignInLink, getApplicantSignInLink } from "../utils/sign-in-link";
import {
  extractApplicantFromMagicLinkCheck,
  MagicLinkCheckApplicant,
} from "../utils/magic-link-check";
import { isCoApplicantRun, RunContext } from "./run-context";

export async function fetchApplicantFromMagicLinkCheck(
  api: ApiClient,
  applicant: Applicant
): Promise<MagicLinkCheckApplicant | undefined> {
  const signInLink = getApplicantSignInLink(applicant);
  const { token } = parseApplicantSignInLink(signInLink);
  const response = await api.checkMagicLink(token);
  const data = await response.json();

  return extractApplicantFromMagicLinkCheck(data);
}

export async function fetchApplicantVerificationsFromPrimaryApi(
  ctx: RunContext,
  applicantId: string
): Promise<Verification[] | undefined> {
  if (!isCoApplicantRun(ctx)) {
    return undefined;
  }

  const appDetailsRaw = await ctx.primaryApi.getApplicationDetails(ctx.app.id!);
  const appDetails = await appDetailsRaw.json();
  const apiApplicants = appDetails.application?.applicants ?? [];
  const matched = apiApplicants.find(
    (entry: { id?: string | number }) => String(entry.id) === applicantId
  );

  return matched?.verifications;
}

export { applyApplicantIdFromMagicLinkCheck } from "../utils/magic-link-check";

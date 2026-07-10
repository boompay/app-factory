import { ApplicationDetailsResponse } from "../types";
import { getApplicant, RunContext } from "./run-context";
import { resolveApplicantId } from "./invite-flow.service";
import { setupVerificationsFromApplicant } from "./verification.service";

export async function refreshApplicantContext(ctx: RunContext): Promise<void> {
  await resolveApplicantId(ctx);

  const applicant = getApplicant(ctx);

  const appDetailsRaw = await ctx.api.getApplicationDetails(ctx.app.id!);
  const appDetails = (await appDetailsRaw.json()) as ApplicationDetailsResponse;
  const email = applicant.email?.email;
  const apiApplicants = appDetails.application?.applicants ?? [];
  const apiApplicant =
    apiApplicants.find((entry) => entry.email === email) ??
    appDetails.application?.current_applicant;

  if (!apiApplicant?.verifications) {
    throw new Error(
      `Verifications not found for applicant at index ${ctx.applicantIndex}`
    );
  }

  setupVerificationsFromApplicant(ctx.app, {
    verifications: apiApplicant.verifications,
  });
  ctx.app.incomeId = undefined;
  ctx.app.incomeSourceId = undefined;
}

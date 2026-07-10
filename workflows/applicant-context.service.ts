import { getApplicant, RunContext } from "./run-context";
import { resolveApplicantId } from "./invite-flow.service";
import { setupVerificationsFromApplicant } from "./verification.service";
import { fetchApplicantFromMagicLinkCheck } from "./co-applicant-context.service";

export async function refreshApplicantContext(ctx: RunContext): Promise<void> {
  await resolveApplicantId(ctx);

  const applicant = getApplicant(ctx);
  const fromMagicLinkCheck = await fetchApplicantFromMagicLinkCheck(
    ctx.api,
    applicant
  );

  if (!fromMagicLinkCheck?.verifications) {
    throw new Error(
      `Verifications not found for applicant at index ${ctx.applicantIndex}. ` +
        `magic_links/check did not return current_applicant.verifications.`
    );
  }

  setupVerificationsFromApplicant(ctx.app, {
    verifications: fromMagicLinkCheck.verifications,
  });
  ctx.app.incomeId = undefined;
  ctx.app.incomeSourceId = undefined;
}

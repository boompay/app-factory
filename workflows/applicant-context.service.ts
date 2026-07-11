import { LoggerProvider } from "../services";
import { Verification } from "../types";
import { getApplicant, isCoApplicantRun, RunContext } from "./run-context";
import { resolveApplicantId } from "./invite-flow.service";
import { setupVerificationsFromApplicant } from "./verification.service";
import {
  fetchApplicantFromMagicLinkCheck,
  fetchApplicantVerificationsFromPrimaryApi,
} from "./co-applicant-context.service";

const logger = LoggerProvider.create("application-applicant-context");

async function resolveApplicantVerifications(
  ctx: RunContext
): Promise<Verification[]> {
  const applicant = getApplicant(ctx);

  const fromMagicLinkCheck = await fetchApplicantFromMagicLinkCheck(
    ctx.api,
    applicant
  );
  if (fromMagicLinkCheck?.verifications?.length) {
    return fromMagicLinkCheck.verifications;
  }

  if (applicant.id) {
    const fromPrimary = await fetchApplicantVerificationsFromPrimaryApi(
      ctx,
      applicant.id
    );
    if (fromPrimary?.length) {
      logger.info(
        `Resolved verifications via primary API for applicant ${applicant.id} (index ${ctx.applicantIndex})`
      );
      return fromPrimary;
    }
  }

  throw new Error(
    `Verifications not found for applicant at index ${ctx.applicantIndex}. ` +
      `Tried magic_links/check` +
      (isCoApplicantRun(ctx) ? " and primary API application details." : ".")
  );
}

export async function refreshApplicantContext(ctx: RunContext): Promise<void> {
  await resolveApplicantId(ctx);

  const verifications = await resolveApplicantVerifications(ctx);

  setupVerificationsFromApplicant(ctx.app, { verifications });
  ctx.app.incomeId = undefined;
  ctx.app.incomeSourceId = undefined;
}

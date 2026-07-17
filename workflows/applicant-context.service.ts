import { LoggerProvider } from "../services";
import { APP_CONFIG } from "../config";
import { Verification } from "../types";
import { getApplicant, isCoApplicantRun, RunContext } from "./run-context";
import { resolveApplicantId } from "./invite-flow.service";
import { setupVerificationsFromApplicant } from "./verification.service";
import {
  fetchApplicantFromMagicLinkCheck,
  fetchApplicantVerificationsFromPrimaryApi,
} from "./co-applicant-context.service";

const logger = LoggerProvider.create("application-applicant-context");

async function fetchApplicantVerifications(
  ctx: RunContext
): Promise<Verification[] | undefined> {
  if (ctx.currentApplicantVerifications?.length) {
    logger.info(
      `Using verifications returned by applicant flow for index ${ctx.applicantIndex}`
    );
    return ctx.currentApplicantVerifications;
  }

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

  return undefined;
}

async function resolveApplicantVerifications(
  ctx: RunContext
): Promise<Verification[]> {
  const waitMs = APP_CONFIG.TIMEOUTS.APPLICANT_VERIFICATIONS_WAIT;
  const intervalMs = APP_CONFIG.TIMEOUTS.APPLICANT_VERIFICATIONS_INTERVAL;
  const deadline = Date.now() + waitMs;
  let attempt = 1;

  while (true) {
    const verifications = await fetchApplicantVerifications(ctx);
    if (verifications) {
      return verifications;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    if (attempt === 1) {
      logger.info(
        `Verifications are not available yet for applicant index ${ctx.applicantIndex}. ` +
          `Waiting up to ${waitMs}ms for backend processing.`
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(intervalMs, remainingMs))
    );
    attempt++;
  }

  throw new Error(
    `Verifications not found for applicant at index ${ctx.applicantIndex}. ` +
      `Tried magic_links/check` +
      (isCoApplicantRun(ctx) ? " and primary API application details." : ".") +
      ` Waited ${waitMs}ms (${attempt} attempts).`
  );
}

export async function refreshApplicantContext(ctx: RunContext): Promise<void> {
  await resolveApplicantId(ctx);

  const verifications = await resolveApplicantVerifications(ctx);

  setupVerificationsFromApplicant(ctx.app, { verifications });
  ctx.app.incomeId = undefined;
  ctx.app.incomeSourceId = undefined;
}

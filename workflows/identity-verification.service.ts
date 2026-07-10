import { LoggerProvider } from "../services";
import { APP_CONFIG } from "../config";
import { STATUS } from "../constants";
import { waitFor } from "../helpers";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-identity-verification");

export async function createIdentityVerification(ctx: RunContext): Promise<void> {
  logger.info("Starting identity verification process");

  const applicant = getApplicant(ctx);
  if (!applicant.id) {
    throw new Error("Current applicant not found or missing ID");
  }

  await ctx.api.createTestIdentityVerification({
    application_id: ctx.app.id,
    applicant_id: applicant.id,
  });

  logger.info("Waiting for identity verification to complete...Take your time");
}

export async function waitForIdentityVerification(ctx: RunContext): Promise<void> {
  logger.info("Checking identity verification by Fast-Track");

  await new Promise((resolve) =>
    setTimeout(resolve, APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_WAIT)
  );

  await waitFor(
    async () => {
      const verificationDetailsRaw = await ctx.api.getVerificationDetails(
        ctx.app.id!,
        ctx.app.verifications!.identity!
      );
      const verificationDetails = await verificationDetailsRaw.json();

      if (verificationDetails.verification.status === STATUS.VERIFIED) {
        logger.info("Identity verification completed successfully");
        return true;
      }

      logger.error(
        `Identity verification not completed. Status: ${verificationDetails.verification.status}`
      );
      return false;
    },
    null,
    APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_CHECK,
    APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_INTERVAL
  );
}

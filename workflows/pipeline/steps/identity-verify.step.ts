import { APP_CONFIG } from "../../../config";
import { STATUS } from "../../../constants";
import { waitFor } from "../../../helpers";
import { LoggerProvider } from "../../../services";
import { PipelineStep } from "../pipeline-step";

const logger = LoggerProvider.create("application-runner");

export const identityVerifyStep: PipelineStep = {
  name: "identity-verify",
  snapshot: true,
  async execute(ctx) {
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
  },
};

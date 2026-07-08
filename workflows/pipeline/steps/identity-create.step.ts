import { LoggerProvider } from "../../../services";
import { getCurrentApplicant } from "../../../models";
import { PipelineStep } from "../pipeline-step";

const logger = LoggerProvider.create("application-runner");

export const identityCreateStep: PipelineStep = {
  name: "identity-create",
  async execute(ctx) {
    logger.info("Starting identity verification process");

    const currentApplicant = getCurrentApplicant(ctx.app);
    if (!currentApplicant?.id) {
      throw new Error("Current applicant not found or missing ID");
    }

    await ctx.api.createTestIdentityVerification({
      application_id: ctx.app.id,
      applicant_id: currentApplicant.id,
    });

    logger.info("Waiting for identity verification to complete...Take your time");
  },
};

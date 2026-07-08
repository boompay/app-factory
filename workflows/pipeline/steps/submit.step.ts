import { getCurrentApplicant } from "../../../models";
import { LoggerProvider } from "../../../services";
import { submitApplication } from "../../enrollment.service";
import { PipelineStep } from "../pipeline-step";

const logger = LoggerProvider.create("application-runner");

export const submitStep: PipelineStep = {
  name: "submit",
  snapshot: { delayMs: 2000 },
  async execute(ctx) {
    await submitApplication(ctx.api, ctx.app);
  },
  async afterSnapshot(ctx) {
    const finalApplicant = getCurrentApplicant(ctx.app);
    if (!finalApplicant) {
      throw new Error("Current applicant not found");
    }

    const middleInitial =
      finalApplicant.middle_name && finalApplicant.middle_name.length > 0
        ? `${finalApplicant.middle_name[0]}. `
        : "";

    logger.info(
      `Completed application flow for application ID: ${ctx.app.id}. Applicant name is ${finalApplicant.first_name || ""} ${middleInitial}${finalApplicant.last_name || ""}`
    );
  },
};

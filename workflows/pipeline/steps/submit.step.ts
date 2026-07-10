import { LoggerProvider } from "../../../services";
import { getApplicant } from "../../run-context";
import { submitApplication } from "../../submission.service";
import { PipelineStep } from "../pipeline-step";

const logger = LoggerProvider.create("application-runner");

export const submitStep: PipelineStep = {
  name: "submit",
  snapshot: { delayMs: 2000 },
  async execute(ctx) {
    await submitApplication(ctx);
  },
  async afterSnapshot(ctx) {
    const finalApplicant = getApplicant(ctx);

    const middleInitial =
      finalApplicant.middle_name && finalApplicant.middle_name.length > 0
        ? `${finalApplicant.middle_name[0]}. `
        : "";

    logger.info(
      `Completed application flow for application ID: ${ctx.app.id}. Applicant name is ${finalApplicant.first_name || ""} ${middleInitial}${finalApplicant.last_name || ""}`
    );
  },
};

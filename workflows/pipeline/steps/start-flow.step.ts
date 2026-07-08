import { APP_CONFIG } from "../../../config";
import { writeTestData } from "../../../utils";
import { startApplicationFlow } from "../../enrollment.service";
import { PipelineStep } from "../pipeline-step";

export const startFlowStep: PipelineStep = {
  name: "start-flow",
  async execute(ctx) {
    await startApplicationFlow(ctx.api, ctx.app, writeTestData, {
      application: APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
      applicant: APP_CONFIG.PATHS.TEST_DATA_APPLICANT,
    });
  },
};

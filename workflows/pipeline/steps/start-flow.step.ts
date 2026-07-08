import { APP_CONFIG } from "../../../config";
import { writeTestData } from "../../../utils";
import { startPrimaryApplicationFlow } from "../../invite-flow.service";
import { PipelineStep } from "../pipeline-step";

export const startFlowStep: PipelineStep = {
  name: "start-flow",
  async execute(ctx) {
    await startPrimaryApplicationFlow(ctx.api, ctx.app, writeTestData, {
      application: APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
      applicant: APP_CONFIG.PATHS.TEST_DATA_APPLICANT,
    }, ctx.applicantIndex);
  },
};

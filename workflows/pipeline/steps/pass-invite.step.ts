import { APP_CONFIG } from "../../../config";
import { writeTestData } from "../../../utils";
import { passApplicantInviteFlow } from "../../enrollment.service";
import { PipelineStep } from "../pipeline-step";

export const passInviteStep: PipelineStep = {
  name: "pass-invite",
  async execute(ctx) {
    await passApplicantInviteFlow(
      ctx.api,
      ctx.app,
      ctx.applicantIndex,
      writeTestData,
      { applicant: APP_CONFIG.PATHS.TEST_DATA_APPLICANT }
    );
  },
};

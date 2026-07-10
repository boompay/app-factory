import { passApplicantInviteFlow } from "../../invite-flow.service";
import { PipelineStep } from "../pipeline-step";

export const passInviteStep: PipelineStep = {
  name: "pass-invite",
  async execute(ctx) {
    await passApplicantInviteFlow(ctx);
  },
};

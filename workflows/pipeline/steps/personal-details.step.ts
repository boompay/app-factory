import { submitPersonalDetails } from "../../personal-details.service";
import { PipelineStep } from "../pipeline-step";

export const personalDetailsStep: PipelineStep = {
  name: "personal-details",
  snapshot: true,
  async execute(ctx) {
    await submitPersonalDetails(ctx.api, ctx.app);
  },
};

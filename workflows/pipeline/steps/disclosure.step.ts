import { passSubmissionDisclosure } from "../../disclosure.service";
import { PipelineStep } from "../pipeline-step";

export const disclosureStep: PipelineStep = {
  name: "disclosure",
  snapshot: true,
  async execute(ctx) {
    await passSubmissionDisclosure(ctx.api, ctx.app, ctx.applicantIndex);
  },
};

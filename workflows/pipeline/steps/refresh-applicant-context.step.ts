import { refreshApplicantContext } from "../../applicant-context.service";
import { PipelineStep } from "../pipeline-step";

export const refreshApplicantContextStep: PipelineStep = {
  name: "refresh-applicant-context",
  async execute(ctx) {
    await refreshApplicantContext(ctx);
  },
};

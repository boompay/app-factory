import { enrollCoApplicant } from "../../enrollment.service";
import { PipelineStep } from "../pipeline-step";

export const coApplicantEnrollStep: PipelineStep = {
  name: "co-applicant-enroll",
  async execute(ctx) {
    await enrollCoApplicant(ctx);
  },
};

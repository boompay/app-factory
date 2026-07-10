import { createIdentityVerification } from "../../identity-verification.service";
import { PipelineStep } from "../pipeline-step";

export const identityCreateStep: PipelineStep = {
  name: "identity-create",
  async execute(ctx) {
    await createIdentityVerification(ctx);
  },
};

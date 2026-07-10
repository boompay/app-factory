import { waitForIdentityVerification } from "../../identity-verification.service";
import { PipelineStep } from "../pipeline-step";

export const identityVerifyStep: PipelineStep = {
  name: "identity-verify",
  snapshot: true,
  async execute(ctx) {
    await waitForIdentityVerification(ctx);
  },
};

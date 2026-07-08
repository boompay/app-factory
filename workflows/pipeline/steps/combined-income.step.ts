import { submitCombinedIncome } from "../../personal-details.service";
import { PipelineStep } from "../pipeline-step";

export const combinedIncomeStep: PipelineStep = {
  name: "combined-income",
  snapshot: true,
  async execute(ctx) {
    await submitCombinedIncome(ctx.api, ctx.app);
  },
};

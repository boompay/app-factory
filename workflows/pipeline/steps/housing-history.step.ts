import { submitHousingHistory } from "../../personal-details.service";
import { PipelineStep } from "../pipeline-step";

export const housingHistoryStep: PipelineStep = {
  name: "housing-history",
  snapshot: true,
  async execute(ctx) {
    await submitHousingHistory(ctx.api, ctx.app);
  },
};

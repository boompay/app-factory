import { submitMoveInDate } from "../../move-in-date.service";
import { PipelineStep } from "../pipeline-step";

export const moveInDateStep: PipelineStep = {
  name: "move-in-date",
  snapshot: true,
  async execute(ctx) {
    await submitMoveInDate(ctx);
  },
};

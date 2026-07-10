import { startPrimaryApplicationFlow } from "../../invite-flow.service";
import { PipelineStep } from "../pipeline-step";

export const startFlowStep: PipelineStep = {
  name: "start-flow",
  async execute(ctx) {
    await startPrimaryApplicationFlow(ctx);
  },
};

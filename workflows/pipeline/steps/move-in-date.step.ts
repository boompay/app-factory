import { getLastDayOfCurrentMonth } from "../../../utils";
import { PipelineStep } from "../pipeline-step";

export const moveInDateStep: PipelineStep = {
  name: "move-in-date",
  snapshot: true,
  async execute(ctx) {
    await ctx.api.submitDesiredMoveInDate(ctx.app.id!, {
      desired_move_in_date: getLastDayOfCurrentMonth(),
    });
  },
};

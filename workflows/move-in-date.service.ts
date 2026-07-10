import { getLastDayOfCurrentMonth } from "../utils";
import { RunContext } from "./run-context";

export async function submitMoveInDate(ctx: RunContext): Promise<void> {
  await ctx.api.submitDesiredMoveInDate(ctx.app.id!, {
    desired_move_in_date: getLastDayOfCurrentMonth(),
  });
}

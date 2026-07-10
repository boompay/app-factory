import { APP_CONFIG } from "../../config";
import { saveApplicationSnapshot } from "../../utils";
import { getSnapshotApi } from "../run-context";
import { PipelineStep } from "./pipeline-step";
import { RunContext } from "./run-context";

export async function runStepWithSnapshot(
  ctx: RunContext,
  step: PipelineStep
): Promise<void> {
  await step.execute(ctx);

  if (!step.snapshot) {
    return;
  }

  const delayMs =
    typeof step.snapshot === "object" ? step.snapshot.delayMs : undefined;

  await saveApplicationSnapshot(
    getSnapshotApi(ctx),
    ctx.app.id!,
    APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
    delayMs
  );

  if (step.afterSnapshot) {
    await step.afterSnapshot(ctx);
  }
}

import { LoggerProvider } from "../../services";
import { PRIMARY_APPLICANT_PIPELINE } from "./applicant-pipeline";
import { PipelineStep } from "./pipeline-step";
import { runStepWithSnapshot } from "./run-step-with-snapshot";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

export async function runApplicantPipeline(
  ctx: RunContext,
  pipeline: PipelineStep[] = PRIMARY_APPLICANT_PIPELINE
): Promise<void> {
  for (const step of pipeline) {
    logger.info(
      `Step: ${step.name} (applicant index ${ctx.applicantIndex})`
    );
    await runStepWithSnapshot(ctx, step);
  }
}

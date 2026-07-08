import { LoggerProvider } from "../../services";
import { APPLICANT_PIPELINE } from "./applicant-pipeline";
import { runStepWithSnapshot } from "./run-step-with-snapshot";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

export async function runApplicantPipeline(ctx: RunContext): Promise<void> {
  for (const step of APPLICANT_PIPELINE) {
    logger.info(`Step: ${step.name}`);
    await runStepWithSnapshot(ctx, step);
  }
}

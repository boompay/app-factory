import { LoggerProvider } from "../../services";
import { getApplicant } from "../run-context";
import { CO_APPLICANT_PIPELINE } from "./applicant-pipeline";
import { runApplicantPipeline } from "./run-applicant-pipeline";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

function prepareCoApplicant(ctx: RunContext, applicantIndex: number): void {
  ctx.applicantIndex = applicantIndex;
  const applicant = getApplicant(ctx);
  const role = applicant.role ?? "applicant";
  logger.info(
    `Preparing ${role} pipeline (index ${applicantIndex}, id ${applicant.id ?? "pending"})`
  );
}

export async function runCoApplicants(ctx: RunContext): Promise<void> {
  const applicants = ctx.app.applicants;
  if (!applicants || applicants.length <= 1) {
    return;
  }

  for (let i = 1; i < applicants.length; i++) {
    prepareCoApplicant(ctx, i);
    await runApplicantPipeline(ctx, CO_APPLICANT_PIPELINE);
  }
}

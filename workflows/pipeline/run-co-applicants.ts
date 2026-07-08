import { LoggerProvider } from "../../services";
import { validateAppInfo, validateApplicationToken } from "../../utils";
import { initializeApi } from "../../services";
import { CO_APPLICANT_PIPELINE } from "./applicant-pipeline";
import { runApplicantPipeline } from "./run-applicant-pipeline";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

async function switchToApplicant(
  ctx: RunContext,
  applicantIndex: number
): Promise<void> {
  const applicant = ctx.app.applicants![applicantIndex];
  logger.info(`Starting application flow for applicant ID: ${applicant.id ?? "pending"}`);

  const applicationToken = applicant.invite_magic_link!.split("/").pop();
  const validatedToken = validateApplicationToken(applicationToken);

  ctx.app = await ctx.tokenProvider.updateBearerToken(validatedToken, ctx.app);
  validateAppInfo(ctx.app);
  ctx.api = await initializeApi(ctx.app);
  ctx.applicantIndex = applicantIndex;
}

export async function runCoApplicants(ctx: RunContext): Promise<void> {
  const applicants = ctx.app.applicants;
  if (!applicants || applicants.length <= 1) {
    return;
  }

  for (let i = 1; i < applicants.length; i++) {
    await switchToApplicant(ctx, i);
    await runApplicantPipeline(ctx, CO_APPLICANT_PIPELINE);
  }
}

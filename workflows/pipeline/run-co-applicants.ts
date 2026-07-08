import { LoggerProvider } from "../../services";
import { validateAppInfo, validateApplicationToken } from "../../utils";
import { initializeApi } from "../enrollment.service";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

export async function runCoApplicantAuth(ctx: RunContext): Promise<void> {
  const applicants = ctx.app.applicants;
  if (!applicants || applicants.length <= 1) {
    return;
  }

  for (let i = 1; i < applicants.length; i++) {
    const applicant = applicants[i];
    logger.info(`Starting application flow for applicant ID: ${applicant.id}`);

    const applicationToken = applicant.invite_magic_link!.split("/").pop();
    const validatedToken = validateApplicationToken(applicationToken);

    ctx.app = await ctx.tokenProvider.updateBearerToken(validatedToken, ctx.app);
    validateAppInfo(ctx.app);
    ctx.api = await initializeApi(ctx.app);
    ctx.applicantIndex = i;

    // TODO: run applicant pipeline for co-applicants
  }
}

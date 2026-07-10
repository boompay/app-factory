import { LoggerProvider } from "../services";
import { transformStatusFields } from "../utils";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-submission");

export async function submitApplication(ctx: RunContext): Promise<void> {
  const appResponseRaw = await ctx.api.getApplicationDetails(ctx.app.id!);
  const appResponse = await appResponseRaw.json();

  const payload = transformStatusFields(appResponse);
  await ctx.api.updateApplication(ctx.app.id!, payload);

  const currentApplicant = getApplicant(ctx);
  if (!currentApplicant.id || !currentApplicant.phone) {
    throw new Error("Current applicant not found or missing required fields");
  }

  logger.info(
    `Application ${ctx.app.id!} for applicant ${currentApplicant.id} with phone number ${currentApplicant.phone} successfully submitted`
  );
}

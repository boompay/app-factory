import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import { uploadSignature } from "./document-upload.service";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-disclosure");

export async function passSubmissionDisclosure(ctx: RunContext): Promise<void> {
  const signatureAssetId = await uploadSignature(
    ctx.api,
    ctx.app,
    "./test-data/signature.svg"
  );
  const currentApplicant = getApplicant(ctx);

  const middleInitial =
    currentApplicant.middle_name && currentApplicant.middle_name.length > 0
      ? `${currentApplicant.middle_name[0]}. `
      : "";
  const signatureAssetIdPayload = {
    data: {
      full_name: `${currentApplicant.first_name || ""} ${middleInitial}${currentApplicant.last_name || ""}`,
      signature: signatureAssetId,
    },
  };

  await ctx.api.providePersonalDetailsSteps(
    ctx.app.id!,
    ctx.app.verifications!.submission_disclosure!,
    APP_CONFIG.STEP_NAMES.SUBMISSION_DISCLOSURE,
    signatureAssetIdPayload
  );

  logger.info(`Submitted submission disclosure`);
  logger.info(`Signature uploaded with asset ID: ${signatureAssetId}`);
}

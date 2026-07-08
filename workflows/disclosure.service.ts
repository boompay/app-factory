import { ApiClient } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import { uploadSignature } from "./document-upload.service";

const logger = LoggerProvider.create("application-disclosure");

export async function passSubmissionDisclosure(
  api: ApiClient,
  app: AppInfo,
  applicantIndex = 0
): Promise<void> {
  const signatureAssetId = await uploadSignature(
    api,
    app,
    "./test-data/signature.svg"
  );
  const currentApplicant = getCurrentApplicant(app, applicantIndex);
  if (!currentApplicant) {
    throw new Error("Current applicant not found");
  }

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

  await api.providePersonalDetailsSteps(
    app.id!,
    app.verifications!.submission_disclosure!,
    APP_CONFIG.STEP_NAMES.SUBMISSION_DISCLOSURE,
    signatureAssetIdPayload
  );

  logger.info(`Submitted submission disclosure`);
  logger.info(`Signature uploaded with asset ID: ${signatureAssetId}`);
}

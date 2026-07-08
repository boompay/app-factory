import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { transformStatusFields } from "../utils";

const logger = LoggerProvider.create("application-submission");

export async function submitApplication(
  api: ApiClient,
  app: AppInfo,
  applicantIndex = 0
): Promise<void> {
  const appResponseRaw = await api.getApplicationDetails(app.id!);
  const appResponse = await appResponseRaw.json();

  const payload = transformStatusFields(appResponse);
  await api.updateApplication(app.id!, payload);

  const currentApplicant = getCurrentApplicant(app, applicantIndex);
  if (!currentApplicant?.id || !currentApplicant.phone) {
    throw new Error("Current applicant not found or missing required fields");
  }

  logger.info(
    `Application ${app.id!} for applicant ${currentApplicant.id} with phone number ${currentApplicant.phone} successfully submitted`
  );
}

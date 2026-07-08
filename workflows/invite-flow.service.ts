import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { APP_CONFIG } from "../config";
import { inviteCoApplicant } from "./applicant-invitation.service";

const logger = LoggerProvider.create("application-invite-flow");

export async function resolveApplicantId(
  api: ApiClient,
  app: AppInfo,
  applicantIndex: number
): Promise<string> {
  const applicant = getCurrentApplicant(app, applicantIndex);
  if (!applicant) {
    throw new Error(`Applicant at index ${applicantIndex} not found`);
  }

  if (applicant.id) {
    return applicant.id;
  }

  const appDetailsRaw = await api.getApplicationDetails(app.id!);
  const appDetails = await appDetailsRaw.json();
  const email = applicant.email?.email;
  const apiApplicants = appDetails.application?.applicants ?? [];
  const matchedApplicant =
    apiApplicants.find((entry: { email?: string }) => entry.email === email) ??
    appDetails.application?.current_applicant;

  if (!matchedApplicant?.id) {
    throw new Error(
      `Could not resolve applicant ID for index ${applicantIndex}`
    );
  }

  applicant.id = matchedApplicant.id;
  return matchedApplicant.id;
}

/**
 * Passes the invite flow for a single applicant.
 * Used by the primary pipeline (after invites) and the co-applicant pipeline.
 */
export async function passApplicantInviteFlow(
  api: ApiClient,
  app: AppInfo,
  applicantIndex: number,
  writeTestData?: (filePath: string, data: unknown) => Promise<void>,
  testDataPaths?: { applicant: string }
): Promise<void> {
  const applicantId = await resolveApplicantId(api, app, applicantIndex);
  const passInviteResponseRaw = await api.passInviteFlow(applicantId);
  const passInviteResponse = await passInviteResponseRaw.json();

  if (writeTestData && testDataPaths) {
    await writeTestData(testDataPaths.applicant, passInviteResponse);
  }

  logger.info(`Passed invite flow for applicant ID: ${applicantId}`);
}

/**
 * Starts the application and invites additional actors (co-applicants, occupants, guarantors).
 * Only runs for the primary applicant — co-applicants use passApplicantInviteFlow directly.
 */
export async function startPrimaryApplicationFlow(
  api: ApiClient,
  app: AppInfo,
  writeTestData: (filePath: string, data: unknown) => Promise<void>,
  testDataPaths: { application: string; applicant: string },
  applicantIndex = 0
): Promise<void> {
  let coApplicantCount = APP_CONFIG.ACTORS.APPLICANT;
  let occupantIndex = APP_CONFIG.ACTORS.OCCUPANT;
  let guarantorsIndex = APP_CONFIG.ACTORS.GUARANTOR;

  const startResponseRaw = await api.startApplication(app.id!);
  const startResponse = await startResponseRaw.json();
  await writeTestData(testDataPaths.application, startResponse);

  const currentApplicant = getCurrentApplicant(app, applicantIndex);
  if (!currentApplicant) {
    throw new Error("Current applicant not found");
  }

  while (coApplicantCount > 0) {
    await inviteCoApplicant(api, app, "applicant");
    coApplicantCount--;
  }

  while (occupantIndex > 0) {
    await inviteCoApplicant(api, app, "occupant");
    occupantIndex--;
  }

  while (guarantorsIndex > 0) {
    await inviteCoApplicant(api, app, "co_signer");
    guarantorsIndex--;
  }

  await passApplicantInviteFlow(
    api,
    app,
    applicantIndex,
    writeTestData,
    { applicant: testDataPaths.applicant }
  );
}

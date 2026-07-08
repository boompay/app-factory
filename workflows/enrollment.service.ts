import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { randomFullName, createTestInbox } from "../helpers";
import { transformStatusFields } from "../utils";
import { APP_CONFIG } from "../config";
import { inviteCoApplicant } from "./applicant-invitation.service";
import { Email } from "../models";

const logger = LoggerProvider.create("application-enrollment");

export async function initializeApi(app: AppInfo): Promise<ApiClient> {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL environment variable is not set");
  }

  if (!app.bearer_token || !app.refresh_token) {
    throw new Error("App info is missing required tokens");
  }

  const api = new ApiClient(baseUrl, app.bearer_token, app.refresh_token);
  await api.init();

  return api;
}

export async function enrollApplication(
  api: ApiClient,
  app: AppInfo,
  applicationToken: string
): Promise<{
  enrollResponse: any;
  user: ReturnType<typeof randomFullName>;
  email: Email;
}> {
  const user = randomFullName();
  const mail = await createTestInbox();
  const email = mail;

  const enrollResponseRaw = await api.enrollWithMagicLink({
    magic_link_token: applicationToken,
    unit_id: app.unit_id,
    applicant: {
      email: email.email,
      first_name: user.first,
      last_name: user.last,
      middle_name: user.middle,
    },
  });

  const enrollResponse = await enrollResponseRaw.json();

  app.id = enrollResponse.application.id;
  if (!app.applicants) {
    app.applicants = [];
  }
  if (app.applicants.length === 0) {
    app.applicants.unshift({});
  }
  app.applicants[0].id = enrollResponse.application.current_applicant.id;
  app.applicants[0]!.email = email;
  app.applicants[0]!.first_name = user.first;
  app.applicants[0]!.last_name = user.last;
  app.applicants[0]!.middle_name = user.middle;

  return { enrollResponse, user, email };
}

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

export async function passApplicantInviteFlow(
  api: ApiClient,
  app: AppInfo,
  applicantIndex: number,
  writeTestData?: (filePath: string, data: any) => Promise<void>,
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

export async function startApplicationFlow(
  api: ApiClient,
  app: AppInfo,
  writeTestData: (filePath: string, data: any) => Promise<void>,
  testDataPaths: { application: string; applicant: string },
  applicantIndex = 0
): Promise<void> {
  let coApplicantCount = APP_CONFIG.ACTORS.APPLICANT;
  let occupantIndex = APP_CONFIG.ACTORS.OCCUPANT;
  let guarantorsIndex = APP_CONFIG.ACTORS.GUARANTOR;
  const startResponseRaw = await api.startApplication(app.id!);
  const startResponse = await startResponseRaw.json();
  await writeTestData(testDataPaths.application, startResponse);

  getCurrentApplicant(app, applicantIndex);

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

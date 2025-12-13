import { ApiClient, LoggerProvider } from "../services";
import { AppInfo } from "../models";
import { randomFullName, createTestInbox } from "../helpers";
import { transformStatusFields } from "../utils";

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
  email: string;
}> {
  const user = randomFullName();
  const mail = await createTestInbox();
  const email = mail.email;

  const enrollResponseRaw = await api.enrollWithMagicLink({
    magic_link_token: applicationToken,
    unit_id: app.unit_id,
    applicant: {
      email: email,
      first_name: user.first,
      last_name: user.last,
      middle_name: user.middle,
    },
  });

  // Parse the JSON response
  const enrollResponse = await enrollResponseRaw.json();

  // Update app with enrollment data
  app.id = enrollResponse.application.id;
  if (!app.applicant) {
    app.applicant = {};
  }
  app.applicant.id = enrollResponse.application.current_applicant.id;
  app.applicant.email = email;
  app.applicant.first_name = user.first;
  app.applicant.last_name = user.last;
  app.applicant.middle_name = user.middle;

  return { enrollResponse, user, email };
}

export async function startApplicationFlow(
  api: ApiClient,
  app: AppInfo,
  writeTestData: (filePath: string, data: any) => Promise<void>,
  testDataPaths: { application: string; applicant: string }
): Promise<void> {
  const startResponseRaw = await api.startApplication(app.id!);
  const startResponse = await startResponseRaw.json();
  await writeTestData(testDataPaths.application, startResponse);

  const passInviteResponseRaw = await api.passInviteFlow(app.applicant!.id!);
  const passInviteResponse = await passInviteResponseRaw.json();
  await writeTestData(testDataPaths.applicant, passInviteResponse);
  logger.info(`Passed invite flow for applicant ID: ${app.applicant!.id}`);
}

export async function submitApplication(
  api: ApiClient,
  app: AppInfo
): Promise<void> {
  const appResponseRaw = await api.getApplicationDetails(app.id!);
  const appResponse = await appResponseRaw.json();
  
  // Transform the response: status "started" → "submitted", application_status "finished" → "submitted"
  const payload = transformStatusFields(appResponse);
  await api.updateApplication(app.id!, payload);
  logger.info(`Application ${app.id!} for applicant ${app.applicant!.id!} with phone number ${app.applicant!.phone!} successfully submitted`);
}
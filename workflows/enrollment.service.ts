import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, Email, getCurrentApplicant } from "../models";
import { randomFullName, createTestInbox } from "../helpers";
import { transformStatusFields } from "../utils";
import { APP_CONFIG } from "../config";
import { inviteCoApplicant } from "./applicant-invitation.service";

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

  // Parse the JSON response
  const enrollResponse = await enrollResponseRaw.json();

  // Update app with enrollment data
  app.id = enrollResponse.application.id;
  if (!app.applicants) {
    app.applicants = [];
  }
  // Update or create the first applicant
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

export async function startApplicationFlow(
  api: ApiClient,
  app: AppInfo,
  writeTestData: (filePath: string, data: any) => Promise<void>,
  testDataPaths: { application: string; applicant: string }
): Promise<void> {
  let applicantIndex = APP_CONFIG.ACTORS.APPLICANT;
  let guarantorIndex = APP_CONFIG.ACTORS.GUARANTOR;
  const startResponseRaw = await api.startApplication(app.id!);
  const startResponse = await startResponseRaw.json();
  await writeTestData(testDataPaths.application, startResponse);

  const currentApplicant = getCurrentApplicant(app);
  if (!currentApplicant || !currentApplicant.id) {
    throw new Error("Current applicant not found or missing ID");
  }
  
  //Invite co-applicant if there are multiple applicants
  while(applicantIndex > 0) {    
    const { magicLink } = await inviteCoApplicant(api, app, "applicant");
    applicantIndex--;
  }
  
  //Invite guarantors if there are guarantors
  while(guarantorIndex > 0) {    
    const { magicLink } = await inviteCoApplicant(api, app, "co_signer");
    guarantorIndex--;
  }

  const passInviteResponseRaw = await api.passInviteFlow(currentApplicant.id);
  const passInviteResponse = await passInviteResponseRaw.json();
  await writeTestData(testDataPaths.applicant, passInviteResponse);
  logger.info(`Passed invite flow for applicant ID: ${currentApplicant.id}`);
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
  const currentApplicant = getCurrentApplicant(app);
  if (!currentApplicant || !currentApplicant.id || !currentApplicant.phone) {
    throw new Error("Current applicant not found or missing required fields");
  }
  logger.info(`Application ${app.id!} for applicant ${currentApplicant.id} with phone number ${currentApplicant.phone} successfully submitted`);
}
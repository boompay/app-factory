import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, Email } from "../models";
import { randomFullName, createTestInbox } from "../helpers";
import { writeAppInfo } from "../utils";
import { APP_CONFIG } from "../config";

const logger = LoggerProvider.create("applicant-invitation");

/**
 * Invites a new co-applicant to the application
 * @param api - The API client
 * @param app - The application info
 * @returns The magic link for the new applicant and the email object
 */
export async function inviteCoApplicant(
  api: ApiClient,
  app: AppInfo,
  role: string
): Promise<{ magicLink: string; email: Email }> {
  if (!app.id) {
    throw new Error("Application ID is required");
  }

  // Ensure has_multiple_applicants is set to true
  const appDetails = await api.getApplicationDetails(app.id);
  const appData = await appDetails.json();
  
  if (!appData.application.has_multiple_applicants && role === "applicant") {
    logger.info("Setting has_multiple_applicants to true");
    await api.patchApplication(app.id, { has_multiple_applicants: true });
  }
  
  if (!appData.application.has_multiple_guarantors && role === "co_signer") {
    logger.info("Setting has_multiple_guarantors to true");
    await api.patchApplication(app.id, { has_multiple_guarantors: true });
  }

  // Generate new applicant data
  let nextUser = randomFullName();
  let nextMail = await createTestInbox();
  let email = nextMail;

  // Invite the co-applicant
  const nextApplicantInvitePayload = {
    application_id: app.id,
    email: email.email,
    first_name: nextUser.first,
    last_name: nextUser.last,
    role: role,
  };

  logger.info(`Inviting co-applicant: ${email.email}`);
  await api.inviteCoApplicant(nextApplicantInvitePayload);

  // Get the magic link for the new applicant
  const magicLinksResp = await api.getMagicLinks(app.id);
  const magicLinksData = await magicLinksResp.json();
  const magicLink = magicLinksData.magic_links.filter((link: any) => link.email === nextMail.email)[0].application_link;
  // Add the new applicant to the app info
  if (!app.applicants) {
    app.applicants = [];
  }
  
  app.applicants.push({
    invite_magic_link: magicLink,
    email: nextMail,
    first_name: nextUser.first,
    last_name: nextUser.last,
    middle_name: nextUser.middle,
  });

  // Save updated app info
  await writeAppInfo(APP_CONFIG.PATHS.CURRENT_APP, app);
  logger.info(`Co-applicant invited successfully. Magic link: ${magicLink}`);

  return { magicLink, email };
}

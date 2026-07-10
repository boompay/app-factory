import { LoggerProvider } from "../services";
import { AppInfo, Email } from "../models";
import { ApplicationDetailsResponse } from "../types";
import { randomFullName, createTestInbox } from "../helpers";
import { writeAppInfo } from "../utils";
import { APP_CONFIG } from "../config";

const logger = LoggerProvider.create("applicant-invitation");

async function resolveInvitedApplicantId(
  api: ApiClient,
  app: AppInfo,
  email: string,
  magicLinkEntry?: { applicant_id?: string | number }
): Promise<string | undefined> {
  if (magicLinkEntry?.applicant_id != null) {
    return String(magicLinkEntry.applicant_id);
  }

  const appDetailsRaw = await api.getApplicationDetails(app.id!);
  const appDetails = (await appDetailsRaw.json()) as ApplicationDetailsResponse;
  const matched = appDetails.application?.applicants?.find(
    (entry) => entry.email === email
  );

  return matched?.id != null ? String(matched.id) : undefined;
}

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

  const nextUser = randomFullName();
  const nextMail = await createTestInbox();
  const email = nextMail;

  const nextApplicantInvitePayload = {
    application_id: app.id,
    email: email.email,
    first_name: nextUser.first,
    last_name: nextUser.last,
    role: role,
  };

  logger.info(`Inviting co-applicant: ${email.email}`);
  await api.inviteCoApplicant(nextApplicantInvitePayload);

  const magicLinksResp = await api.getMagicLinks(app.id);
  const magicLinksData = await magicLinksResp.json();
  const magicLinkEntry = magicLinksData.magic_links.find(
    (link: { email?: string }) => link.email === nextMail.email
  );
  const magicLink = magicLinkEntry?.application_link;

  if (!magicLink) {
    throw new Error(`Magic link not found for invited applicant ${email.email}`);
  }

  const applicantId = await resolveInvitedApplicantId(
    api,
    app,
    email.email,
    magicLinkEntry
  );

  if (!app.applicants) {
    app.applicants = [];
  }

  app.applicants.push({
    id: applicantId,
    role,
    sign_in_link: magicLink,
    invite_magic_link: magicLink,
    email: nextMail,
    first_name: nextUser.first,
    last_name: nextUser.last,
    middle_name: nextUser.middle,
  });

  await writeAppInfo(APP_CONFIG.PATHS.CURRENT_APP, app);
  logger.info(`Co-applicant invited successfully. Magic link: ${magicLink}`);
  if (applicantId) {
    logger.info(`Resolved co-applicant ID at invite time: ${applicantId}`);
  }

  return { magicLink, email };
}

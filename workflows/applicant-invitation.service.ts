import { ApiClient, LoggerProvider } from "../services";
import { AppInfo, Email } from "../models";
import { ApplicationDetailsResponse } from "../types";
import { randomFullName, createTestInbox } from "../helpers";
import { writeAppInfo } from "../utils";
import { APP_CONFIG } from "../config";
import { fetchApplicantFromMagicLinkCheck } from "./co-applicant-context.service";

const logger = LoggerProvider.create("applicant-invitation");

type MagicLinkEntry = {
  applicant_id?: string | number;
  id?: string | number;
  application_link?: string;
  email?: string;
};

function applicantEmails(email: Email): string[] {
  return [email.email, email.inboxEmail].filter(Boolean);
}

async function resolveInvitedApplicantId(
  api: ApiClient,
  app: AppInfo,
  email: Email,
  magicLinkEntry?: MagicLinkEntry
): Promise<string | undefined> {
  const emails = applicantEmails(email);
  for (let attempt = 0; attempt < 3; attempt++) {
    const appDetailsRaw = await api.getApplicationDetails(app.id!);
    const appDetails = (await appDetailsRaw.json()) as ApplicationDetailsResponse;
    const matched = appDetails.application?.applicants?.find(
      (entry) => entry.email != null && emails.includes(entry.email)
    );

    if (matched?.id != null) {
      return String(matched.id);
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (magicLinkEntry?.application_link) {
    const fromCheck = await fetchApplicantFromMagicLinkCheck(api, {
      sign_in_link: magicLinkEntry.application_link,
    });
    if (fromCheck?.id != null) {
      return String(fromCheck.id);
    }
  }

  return undefined;
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
    (link: { email?: string }) =>
      link.email === nextMail.email || link.email === nextMail.inboxEmail
  );
  const magicLink = magicLinkEntry?.application_link;

  if (!magicLink) {
    throw new Error(`Magic link not found for invited applicant ${email.email}`);
  }

  const applicantId = await resolveInvitedApplicantId(
    api,
    app,
    nextMail,
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
  } else {
    logger.warn(
      `Could not resolve co-applicant ID at invite time for ${nextMail.email}. ` +
        `Will retry via magic_links/check or primary API during co-applicant pipeline.`
    );
  }

  return { magicLink, email };
}

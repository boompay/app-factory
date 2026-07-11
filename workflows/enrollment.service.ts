import { ApiClient, LoggerProvider } from "../services";
import { EnrollResponse } from "../types";
import { AppInfo, Email } from "../models";
import { randomFullName, createTestInbox } from "../helpers";
import { getApplicantSignInLink, parseApplicantSignInLink } from "../utils/sign-in-link";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-enrollment");

export async function enrollApplication(
  api: ApiClient,
  app: AppInfo,
  applicationToken: string
): Promise<{
  enrollResponse: EnrollResponse;
  user: ReturnType<typeof randomFullName>;
  email: Email;
}> {
  const user = randomFullName();
  const email = await createTestInbox();

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

  const enrollResponse = (await enrollResponseRaw.json()) as EnrollResponse;

  app.id = enrollResponse.application.id;
  if (!app.applicants) {
    app.applicants = [];
  }
  if (app.applicants.length === 0) {
    app.applicants.unshift({});
  }
  app.applicants[0].id = enrollResponse.application.current_applicant.id;
  app.applicants[0]!.role = "applicant";
  app.applicants[0]!.email = email;
  app.applicants[0]!.first_name = user.first;
  app.applicants[0]!.last_name = user.last;
  app.applicants[0]!.middle_name = user.middle;

  return { enrollResponse, user, email };
}

/**
 * Enrolls an invited co-applicant after sign-in. Creates the BoomScreen applicant
 * record (current_applicant.id) required for pass_invite_flow.
 */
export async function enrollCoApplicant(ctx: RunContext): Promise<void> {
  const applicant = getApplicant(ctx);

  if (applicant.id) {
    logger.info(
      `Co-applicant already enrolled (index ${ctx.applicantIndex}, id ${applicant.id})`
    );
    return;
  }

  if (!ctx.app.unit_id) {
    throw new Error("unit_id is required to enroll co-applicant");
  }

  const email = applicant.email?.email;
  const firstName = applicant.first_name;
  const lastName = applicant.last_name;

  if (!email || !firstName || !lastName) {
    throw new Error(
      `Co-applicant at index ${ctx.applicantIndex} is missing invite profile data required for enroll`
    );
  }

  const signInLink = getApplicantSignInLink(applicant);
  const { token } = parseApplicantSignInLink(signInLink);

  logger.info(
    `Enrolling co-applicant via magic link (index ${ctx.applicantIndex}, email ${email})`
  );

  const enrollResponseRaw = await ctx.api.enrollWithMagicLink({
    magic_link_token: token,
    unit_id: ctx.app.unit_id,
    applicant: {
      email,
      first_name: firstName,
      last_name: lastName,
      middle_name: applicant.middle_name,
    },
  });

  const enrollResponse = (await enrollResponseRaw.json()) as EnrollResponse;
  const applicantId = enrollResponse.application?.current_applicant?.id;

  if (applicantId == null) {
    throw new Error(
      `enroll_with_magic_link did not return current_applicant.id for co-applicant index ${ctx.applicantIndex}`
    );
  }

  applicant.id = String(applicantId);
  ctx.app.id = enrollResponse.application.id;

  logger.info(
    `Co-applicant enrolled with applicant ID ${applicant.id} (index ${ctx.applicantIndex})`
  );
}

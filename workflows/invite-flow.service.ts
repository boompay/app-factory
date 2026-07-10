import { LoggerProvider } from "../services";
import { APP_CONFIG } from "../config";
import { writeTestData } from "../utils";
import { inviteCoApplicant } from "./applicant-invitation.service";
import { fetchApplicantFromMagicLinkCheck } from "./co-applicant-context.service";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-invite-flow");

export async function resolveApplicantId(ctx: RunContext): Promise<string> {
  const applicant = getApplicant(ctx);

  if (applicant.id) {
    return applicant.id;
  }

  const fromMagicLinkCheck = await fetchApplicantFromMagicLinkCheck(
    ctx.api,
    applicant
  );
  if (fromMagicLinkCheck?.id != null) {
    applicant.id = String(fromMagicLinkCheck.id);
    return applicant.id;
  }

  throw new Error(
    `Could not resolve applicant ID for index ${ctx.applicantIndex}. ` +
      `Co-applicant tokens cannot read GET /screen/applications/{id} (403). ` +
      `Ensure applicant.id is stored at invite time or returned by magic_links/check.`
  );
}

/**
 * Passes the invite flow for a single applicant.
 * Used by the primary pipeline (after invites) and the co-applicant pipeline.
 */
export async function passApplicantInviteFlow(
  ctx: RunContext,
  options: { persistTestData?: boolean } = { persistTestData: true }
): Promise<void> {
  const applicantId = await resolveApplicantId(ctx);
  const passInviteResponseRaw = await ctx.api.passInviteFlow(applicantId);
  const passInviteResponse = await passInviteResponseRaw.json();

  if (options.persistTestData) {
    await writeTestData(
      APP_CONFIG.PATHS.TEST_DATA_APPLICANT,
      passInviteResponse
    );
  }

  logger.info(`Passed invite flow for applicant ID: ${applicantId}`);
}

/**
 * Starts the application and invites additional actors (co-applicants, occupants, guarantors).
 * Only runs for the primary applicant — co-applicants use passApplicantInviteFlow directly.
 */
export async function startPrimaryApplicationFlow(
  ctx: RunContext
): Promise<void> {
  let coApplicantCount = APP_CONFIG.ACTORS.APPLICANT;
  let occupantIndex = APP_CONFIG.ACTORS.OCCUPANT;
  let guarantorsIndex = APP_CONFIG.ACTORS.GUARANTOR;

  const startResponseRaw = await ctx.api.startApplication(ctx.app.id!);
  const startResponse = await startResponseRaw.json();
  await writeTestData(APP_CONFIG.PATHS.TEST_DATA_APPLICATION, startResponse);

  getApplicant(ctx);

  while (coApplicantCount > 0) {
    await inviteCoApplicant(ctx.api, ctx.app, "applicant");
    coApplicantCount--;
  }

  while (occupantIndex > 0) {
    await inviteCoApplicant(ctx.api, ctx.app, "occupant");
    occupantIndex--;
  }

  while (guarantorsIndex > 0) {
    await inviteCoApplicant(ctx.api, ctx.app, "co_signer");
    guarantorsIndex--;
  }

  await passApplicantInviteFlow(ctx);
}

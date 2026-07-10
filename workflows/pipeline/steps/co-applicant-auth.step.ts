import { initializeApi, LoggerProvider } from "../../services";
import { validateAppInfo } from "../../utils";
import { getApplicantSignInLink } from "../../utils/sign-in-link";
import { getApplicant } from "../run-context";
import { PipelineStep } from "../pipeline-step";

const logger = LoggerProvider.create("application-co-applicant-auth");

export const coApplicantAuthStep: PipelineStep = {
  name: "co-applicant-auth",
  async execute(ctx) {
    const applicant = getApplicant(ctx);
    const signInLink = getApplicantSignInLink(applicant);
    const role = applicant.role ?? "applicant";

    logger.info(
      `Starting ${role} sign-in (index ${ctx.applicantIndex}): ${signInLink}`
    );

    ctx.app = await ctx.tokenProvider.authenticateCoApplicant(
      signInLink,
      ctx.app,
      ctx.applicantIndex
    );
    validateAppInfo(ctx.app);
    ctx.api = await initializeApi(ctx.app);

    logger.info(
      `Co-applicant authenticated and API client initialized (index ${ctx.applicantIndex})`
    );
  },
};

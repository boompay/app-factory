import { AuthTokenProvider, initializeApi, LoggerProvider } from "../../services";
import { APP_CONFIG } from "../../config";
import {
  clearLogFiles,
  extractBaseUrlFromLink,
  validateAppInfo,
  validateApplicationToken,
  validateRequiredEnv,
  writeAppInfo,
} from "../../utils";
import { enrollApplication } from "../enrollment.service";
import { setupVerifications } from "../verification.service";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-runner");

export async function bootstrapRun(magicLink: string): Promise<RunContext> {
  await clearLogFiles();

  const baseUrl = extractBaseUrlFromLink(magicLink);
  process.env.BASE_URL = baseUrl;
  logger.info(`Using BASE_URL: ${baseUrl} (extracted from link)`);

  validateRequiredEnv();

  const applicationToken = magicLink.split("/").pop();
  const validatedToken = validateApplicationToken(applicationToken);

  const tokenProvider = new AuthTokenProvider(baseUrl);
  const app = await tokenProvider.getBearerToken(validatedToken);

  validateAppInfo(app);
  const api = await initializeApi(app);

  const { enrollResponse, user, email } = await enrollApplication(
    api,
    app,
    validatedToken
  );
  app.applicants![0].invite_magic_link = magicLink;

  setupVerifications(app, enrollResponse);
  await writeAppInfo(APP_CONFIG.PATHS.CURRENT_APP, app);
  logger.info(
    `Enrolled application ID: ${app.id} for user ${user.full} with email ${email.email}`
  );
  logger.info(`Applicant's email here: ${email.inboxEmail}`);
  logger.info(`With password: ${email.password}`);

  return {
    api,
    app,
    tokenProvider,
    applicantIndex: 0,
    magicLink,
  };
}

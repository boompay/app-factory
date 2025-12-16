import { AuthTokenProvider, LoggerProvider } from "./services";
import { APP_CONFIG } from "./config";
import { AppInfo } from "./models";
import {
  readAppInfo,
  writeAppInfo,
  writeTestData,
  validateAppInfo,
  validateRequiredEnv,
  validateApplicationToken,
  clearLogFiles,
  getLastDayOfCurrentMonth,
} from "./utils";
import {
  initializeApi,
  enrollApplication,
  startApplicationFlow,
  submitCombinedIncome,
  passSubmissionDisclosure,
  submitApplication,
} from "./workflows";
import { waitFor } from "./helpers";
import { setupVerifications } from "./workflows";
import { submitPersonalDetails, submitHousingHistory } from "./workflows";
import { ApiClient } from "./services";
import { STATUS } from "./constants";

const logger = LoggerProvider.create("application-runner");

/**
 * Extracts the BASE_URL from a magic link URL
 * @param link - The magic link URL
 * @returns The BASE_URL (e.g., https://api.staging.boompay.app)
 */
function extractBaseUrlFromLink(link: string): string {
  try {
    const url = new URL(link);
    const hostname = url.hostname;
    
    // Replace 'screen' with 'api' in the hostname
    // screen.staging.boompay.app -> api.staging.boompay.app
    // screen.staging2.boompay.app -> api.staging2.boompay.app
    const apiHostname = hostname.replace(/^screen\./, "api.");
    
    // Construct the base URL with the same protocol
    return `${url.protocol}//${apiHostname}`;
  } catch (error) {
    throw new Error(`Invalid magic link URL: ${link}`);
  }
}

/**
 * Saves a snapshot of application details to a test data file
 * @param api - The API client
 * @param applicationId - The application ID
 * @param filePath - Path to save the test data
 */
async function saveApplicationSnapshot(
  api: ApiClient,
  applicationId: string,
  filePath: string
): Promise<void> {
  const appResponseRaw = await api.getApplicationDetails(applicationId);
  const appResponse = await appResponseRaw.json();
  await writeTestData(filePath, appResponse);
}

async function run(link: string): Promise<void> {
  try {
    // Clear log files before each run
    await clearLogFiles();

    // Extract BASE_URL from magic link and set it in environment
    const baseUrl = extractBaseUrlFromLink(link);
    process.env.BASE_URL = baseUrl;
    logger.info(`Using BASE_URL: ${baseUrl} (extracted from link)`);

    validateRequiredEnv();

    const applicationToken = link.split("/").pop();
    const validatedToken = validateApplicationToken(applicationToken);

    // Initialize authentication
    // AuthTokenProvider needs the base URL, not the application token
    const tokenProvider = new AuthTokenProvider(baseUrl);
    // getBearerToken() returns AppInfo directly and also writes it to current-app.json for persistence
    const app = await tokenProvider.getBearerToken(validatedToken);

    // Validate and initialize API
    // Note: ApiClient is initialized once and reused across all workflows
    // to maintain consistent token state and enable automatic token refresh
    validateAppInfo(app);
    const api = await initializeApi(app);

    // Enroll application
    const { enrollResponse, email } = await enrollApplication(
      api,
      app,
      validatedToken
    );

    // Setup verifications
    setupVerifications(app, enrollResponse);
    await writeAppInfo(APP_CONFIG.PATHS.CURRENT_APP, app);
    logger.info(`Enrolled application ID: ${app.id} for ${email}`);

    // Start application flow
    await startApplicationFlow(api, app, writeTestData, {
      application: APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
      applicant: APP_CONFIG.PATHS.TEST_DATA_APPLICANT,
    });

    //Submit IDV by Fast-Track
    logger.info("Starting identity verification process");
    let payload = { application_id: app.id, applicant_id: app.applicant!.id };
    await api.createTestIdentityVerification(payload);
    logger.info("Waiting for identity verification to complete...Take your time");

    // Submit personal details
    await submitPersonalDetails(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    // Submit housing history
    await submitHousingHistory(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    //Submit combined income
    await submitCombinedIncome(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    //Desired move in date
    const moveInPayload = {
      desired_move_in_date: getLastDayOfCurrentMonth()
    }
    await api.submitDesiredMoveInDate(app.id!, moveInPayload);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    //Sign submission disclosure
    await passSubmissionDisclosure(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    //Check IDV by Fast-Track
    logger.info("Checking identity verification by Fast-Track");    
    await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_WAIT));

    await waitFor(async () => {
      const verificationDetailsRaw = await api.getVerificationDetails(
        app.id!,
        app.verifications!.identity!
      );
      const verificationDetails = await verificationDetailsRaw.json();
      if (verificationDetails.verification.status === STATUS.VERIFIED) {
        logger.info("Identity verification completed successfully");
        return true;
      } else {
        logger.error(
          `Identity verification not completed. Status: ${verificationDetails.verification.status}`
        );
        return false;
      }      
    }, null, APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_CHECK, APP_CONFIG.TIMEOUTS.IDENTITY_VERIFICATION_INTERVAL);

    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    //Submit application
    await submitApplication(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION
    );

    logger.info(`Completed application flow for application ID: ${app.id}. Applicant name is ${app.applicant!.first_name!} ${app.applicant!.middle_name![0]}. ${app.applicant!.last_name!}`);
  } catch (error) {
    logger.error("Error running application flow:", error);
    throw error;
  }
}

// Main execution
const magicLink =
  process.argv[2] ||
  "https://screen.staging.boompay.app/a/DfmlqHeL6gqNU3aLKAJd";
run(magicLink).catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

import { AuthTokenProvider, LoggerProvider } from "./services";
import { APP_CONFIG } from "./config";
import { getCurrentApplicant, Email } from "./models";
import {
  writeAppInfo,
  writeTestData,
  validateAppInfo,
  validateRequiredEnv,
  validateApplicationToken,
  extractBaseUrlFromLink,
  clearLogFiles,
  getLastDayOfCurrentMonth,
  saveApplicationSnapshot,
} from "./utils";
import {
  initializeApi,
  enrollApplication,
  startApplicationFlow,
  submitCombinedIncome,
  passSubmissionDisclosure,
  submitApplication,
  inviteCoApplicant,
} from "./workflows";
import { waitFor } from "./helpers";
import { setupVerifications } from "./workflows";
import { submitPersonalDetails, submitHousingHistory } from "./workflows";
import { STATUS } from "./constants";

const logger = LoggerProvider.create("application-runner");

//Main runner function
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
    app.applicants![0].invite_magic_link = link;
    
    // Setup verifications
    setupVerifications(app, enrollResponse);
    await writeAppInfo(APP_CONFIG.PATHS.CURRENT_APP, app);
    logger.info(`Enrolled application ID: ${app.id} for ${email.email}`);

    // Start application flow
    await startApplicationFlow(api, app, writeTestData, {
      application: APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
      applicant: APP_CONFIG.PATHS.TEST_DATA_APPLICANT,
    });

    //Submit IDV by Fast-Track
    logger.info("Starting identity verification process");
    const currentApplicant = getCurrentApplicant(app);
    if (!currentApplicant || !currentApplicant.id) {
      throw new Error("Current applicant not found or missing ID");
    }
    let payload = { application_id: app.id, applicant_id: currentApplicant.id };
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

    const finalApplicant = getCurrentApplicant(app);
    if (!finalApplicant) {
      throw new Error("Current applicant not found");
    }
    const middleInitial = finalApplicant.middle_name && finalApplicant.middle_name.length > 0 
      ? `${finalApplicant.middle_name[0]}. ` 
      : "";

    //Submit application
    await submitApplication(api, app);
    await saveApplicationSnapshot(
      api,
      app.id!,
      APP_CONFIG.PATHS.TEST_DATA_APPLICATION,
      2000 
    );
    logger.info(`Completed application flow for application ID: ${app.id}. Applicant name is ${finalApplicant.first_name || ""} ${middleInitial}${finalApplicant.last_name || ""}`);
    
  } catch (error) {
    logger.error("Error running application flow:", error);
    throw error;
  }
}

// Main execution
const magicLink =
  process.argv[2] ||
  "https://screen.staging2.boompay.app/a/MCzt7UT5V2iZqbgRTSIv";
run(magicLink).catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

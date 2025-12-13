import { ApiClient } from "../services";
import { AppInfo } from "../models";
import { PersonalDetailsStepConfig } from "../types";
import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import {
  randomFullName,
  generateRandomUsCaPhone,
  getRandomAddress,
  randomInt,
  generateEmployeeData,
} from "../helpers";
import {
  readFileAsBuffer,
  uploadFileToS3Bucket,
  PresignResponse,
} from "../utils";
import { CONTENT_TYPES } from "../constants";

const logger = LoggerProvider.create("application-personal-details");

export async function submitPersonalDetailsSteps(
  api: ApiClient,
  applicationId: string,
  verificationId: string,
  steps: PersonalDetailsStepConfig[]
): Promise<void> {
  for (const step of steps) {
    await api.providePersonalDetailsSteps(
      applicationId,
      verificationId,
      step.stepName,
      step.getPayload()
    );
    logger.info(`Submitted step: ${step.stepName}`);
  }
}

export function createPersonalDetailsStepsConfig(
  app: AppInfo
): PersonalDetailsStepConfig[] {
  return [
    {
      stepName: APP_CONFIG.STEP_NAMES.PERSONAL_DETAILS,
      getPayload: () => ({
        data: {
          contact_first_name: app.applicant!.first_name!,
          contact_last_name: app.applicant!.last_name!,
          contact_middle_name: app.applicant!.middle_name!,
          contact_email: app.applicant!.email!,
          contact_phone_number: app.applicant!.phone!,
        },
      }),
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.DEPENDENTS,
      getPayload: () => ({
        data: { dependents: APP_CONFIG.DEFAULT_VALUES.DEPENDENTS },
      }),
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.EMERGENCY_CONTACTS,
      getPayload: () => {
        const emergencyContact = randomFullName();
        const emergencyContactPhone = generateRandomUsCaPhone("digits");
        return {
          data: {
            emergency_contacts: [
              {
                first_name: emergencyContact.first,
                last_name: emergencyContact.last,
                phone_number: emergencyContactPhone,
                relationship:
                  APP_CONFIG.DEFAULT_VALUES.EMERGENCY_CONTACT_RELATIONSHIP,
              },
            ],
          },
        };
      },
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.PETS,
      getPayload: () => ({
        data: { do_you_have_pets: APP_CONFIG.DEFAULT_VALUES.PETS },
      }),
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.VEHICLES,
      getPayload: () => ({
        data: { do_you_have_vehicles: APP_CONFIG.DEFAULT_VALUES.VEHICLES },
      }),
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.MILITARY_FIRST_RESPONDER_TEACHER,
      getPayload: () => ({
        data: {
          are_you_military_first_responder_teacher:
            APP_CONFIG.DEFAULT_VALUES.MILITARY_FIRST_RESPONDER_TEACHER,
        },
      }),
    },
    {
      stepName: APP_CONFIG.STEP_NAMES.LEAD_SOURCE,
      getPayload: () => ({
        data: { lead_source: APP_CONFIG.DEFAULT_VALUES.LEAD_SOURCE },
      }),
    },
  ];
}

export async function submitPersonalDetails(
  api: ApiClient,
  app: AppInfo
): Promise<void> {
  const personalDetailsSteps = createPersonalDetailsStepsConfig(app);
  await submitPersonalDetailsSteps(
    api,
    app.id!,
    app.verifications!.personal_details!,
    personalDetailsSteps
  );
}

export async function submitHousingHistory(
  api: ApiClient,
  app: AppInfo
): Promise<void> {
  const address = await getRandomAddress("us");
  const apartNumber = randomInt(1, 100).toString();
  const addressPayload = {
    data: {
      address: [
        {
          housing_type: APP_CONFIG.DEFAULT_VALUES.HOUSING_TYPE,
          own_home: {
            address: `${address.housenumber} ${address.street},${apartNumber}, ${address.city}, ${address.state} ${address.postcode}`,
            address_components: {
              address1: `${address.housenumber} ${address.street}`,
              address2: apartNumber,
              city: address.city,
              state: address.state,
              zip: address.postcode,
              country: address.country_code!.toUpperCase() || "US",
              county: address.county,
            },
            current_residence: true,
            move_in_date: "2020-01-01",
            monthly_mortgage_payment: randomInt(1000, 3000),
            reason_for_leaving: "Just because",
          },
        },
      ],
    },
  };

  await api.providePersonalDetailsSteps(
    app.id!,
    app.verifications!.housing_history!,
    APP_CONFIG.STEP_NAMES.HOUSING_HISTORY,
    addressPayload
  );
  logger.info(`Submitted housing history`);
}

export async function submitCombinedIncome(
  api: ApiClient,
  app: AppInfo
): Promise<void> {
  const employee = generateEmployeeData();
  const employmentPayload = {
      type: "self_employment",
      start_date: employee.startDate,
      additional_data:{
        company: employee.company,
        job_title: employee.jobTitle,
      },
      amount:{
        cents: employee.monthlySalary * 100,
        currency: "USD",
      },
      pay_period: "monthly"
    };

  let incomeVResponse = await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "income",
    employmentPayload
  );
  let incomeVerificationDetails = await incomeVResponse.json();
  app.incomeId = incomeVerificationDetails.id;
  logger.info(`Submitted first part of combined income verification: ${app.incomeId}`);

  const incomeSourcePayload = {
    income_id: app.incomeId,
    type: "paystub"
  }
  
  let incomeSourceResponse = await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "income_sources",
    incomeSourcePayload
  );
  let incomeSourceDetails = await incomeSourceResponse.json();
  app.incomeSourceId = incomeSourceDetails.id;
  logger.info(`Submitted second part of combined income verification: ${app.incomeSourceId}`);

  await uploadDocument(api, app, "./test-data/Paystub.pdf", "paystub");

  await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "finish"
  );
}

export async function passSubmissionDisclosure(
  api: ApiClient,
  app: AppInfo
): Promise<void> {
  // Upload signature and get asset global_id
  const signatureAssetId = await uploadSignature(api, app, "./test-data/signature.svg");
  const signatureAssetIdPayload = {
    data: {
      full_name: `${app.applicant!.first_name!} ${app.applicant!.middle_name![0]}. ${app.applicant!.last_name!}`,
      signature: signatureAssetId
    }
  };

  await api.providePersonalDetailsSteps(
    app.id!,
    app.verifications!.submission_disclosure!,
    APP_CONFIG.STEP_NAMES.SUBMISSION_DISCLOSURE,
    signatureAssetIdPayload
  );

  logger.info(`Submitted submission disclosure`);
  logger.info(`Signature uploaded with asset ID: ${signatureAssetId}`);
}

/**
 * Uploads a signature SVG file and returns the asset global_id
 * @param api - The API client
 * @param app - The application info
 * @param filePath - Path to the SVG signature file
 * @returns The global_id of the created asset
 */
export async function uploadSignature(
  api: ApiClient,
  app: AppInfo,
  filePath: string
): Promise<string> {
  // Step 1: Get presigned URL
  const filename = filePath.split(/[/\\]/).pop() || "signature.svg";
  const contentType = "image/svg+xml";
  
  logger.info(`Getting presigned URL for signature file: ${filename}`);
  const presignResponse = await api.getPresignedUrl(filename, contentType);
  const presignData: PresignResponse = await presignResponse.json();
  
  if (!presignData.url) {
    throw new Error("Failed to get presigned URL: missing url in response");
  }

  // Step 2: Read file and upload to S3
  logger.info(`Reading signature file from: ${filePath}`);
  const fileBuffer = await readFileAsBuffer(filePath);
  const fileSize = fileBuffer.length;

  logger.info(`Uploading signature to S3: ${presignData.url}`);
  await uploadFileToS3Bucket(presignData.url, fileBuffer, contentType);
  logger.info(`Signature uploaded successfully to S3`);

  // Step 3: Create asset and get global_id
  const assetPayload = {
    url: presignData.url,
    metadata: {
      size: fileSize,
      original_filename: filename,
      content_type: contentType,
    },
  };

  logger.info(`Creating asset record for signature`);
  try {
    const assetResponse = await api.createAsset(app.id!, assetPayload, undefined, 60000, 3);
    const assetData = await assetResponse.json();
    
    if (assetData.asset?.global_id) {
      logger.info(`Signature asset created successfully. Asset ID: ${assetData.asset.global_id}`);
      return assetData.asset.global_id;
    } else {
      logger.error(`Failed to get asset ID from asset response: ${JSON.stringify(assetData)}`);
      throw new Error("Failed to get asset ID from asset creation response");
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    logger.error(`Failed to create signature asset after retries: ${errorMessage}`);
    throw new Error(`Signature asset creation failed: ${errorMessage}`);
  }
}

export async function uploadDocument(
  api: ApiClient,
  app: AppInfo,
  filePath: string,
  documentType: string
): Promise<void> {
  if (!app.incomeSourceId) {
    throw new Error("incomeSourceId is required for document upload");
  }

  // Step 1: Get presigned URL
  const filename = filePath.split(/[/\\]/).pop() || "document.pdf";
  const contentType = filename.endsWith(".pdf") 
    ? CONTENT_TYPES.PDF 
    : CONTENT_TYPES.OCTET_STREAM;
  
  logger.info(`Getting presigned URL for file: ${filename}`);
  const presignResponse = await api.getPresignedUrl(filename, contentType);
  const presignData: PresignResponse = await presignResponse.json();
  
  if (!presignData.url) {
    throw new Error("Failed to get presigned URL: missing url in response");
  }

  // Step 2: Read file and upload to S3
  logger.info(`Reading file from: ${filePath}`);
  const fileBuffer = await readFileAsBuffer(filePath);
  const fileSize = fileBuffer.length;

  logger.info(`Uploading file to S3: ${presignData.url}`);
  await uploadFileToS3Bucket(presignData.url, fileBuffer, contentType);
  logger.info(`File uploaded successfully to S3`);

  // Step 3: Create document record
  const documentPayload = {
    documents: [
      {
        document_type: documentType,
        url: presignData.url,
        metadata: {
          size: fileSize,
          original_filename: filename,
          content_type: contentType,
        },
      },
    ],
  };

  logger.info(`Creating document record for income source: ${app.incomeSourceId}`);
  const documentResponse = await api.uploadDocumentsToIncomeSource(
    app.id!,
    app.verifications!.combined_income!,
    app.incomeSourceId,
    documentPayload
  );
  const documentData = await documentResponse.json();
  
  if (documentData.assets?.items?.length > 0) {
    logger.info(`Document uploaded successfully. Asset ID: ${documentData.assets.items[0].global_id}`);
  } else {
    logger.warn("Document upload completed but no assets returned in response");
  }
}

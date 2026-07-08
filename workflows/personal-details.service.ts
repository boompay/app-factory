import { ApiClient } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { PersonalDetailsStepConfig } from "../types";
import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import {
  randomFullName,
  generateRandomUsCaPhone,
} from "../helpers";

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
  app: AppInfo,
  applicantIndex = 0
): PersonalDetailsStepConfig[] {
  const currentApplicant = getCurrentApplicant(app, applicantIndex);
  if (!currentApplicant) {
    throw new Error("Current applicant not found");
  }

  return [
    {
      stepName: APP_CONFIG.STEP_NAMES.PERSONAL_DETAILS,
      getPayload: () => ({
        data: {
          contact_first_name: currentApplicant.first_name!,
          contact_last_name: currentApplicant.last_name!,
          contact_middle_name: currentApplicant.middle_name!,
          contact_email: currentApplicant.email!.email,
          contact_phone_number: `+1${currentApplicant.phone!}`,
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
  app: AppInfo,
  applicantIndex = 0
): Promise<void> {
  const personalDetailsSteps = createPersonalDetailsStepsConfig(
    app,
    applicantIndex
  );
  await submitPersonalDetailsSteps(
    api,
    app.id!,
    app.verifications!.personal_details!,
    personalDetailsSteps
  );
}

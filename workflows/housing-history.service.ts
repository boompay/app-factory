import { ApiClient } from "../services";
import { AppInfo, getCurrentApplicant } from "../models";
import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import { getRandomAddress, randomInt } from "../helpers";
import { uploadLeaseAgreement } from "./document-upload.service";

const logger = LoggerProvider.create("application-housing-history");

export async function submitHousingHistory(
  api: ApiClient,
  app: AppInfo,
  applicantIndex = 0
): Promise<void> {
  const currentApplicant = getCurrentApplicant(app, applicantIndex);
  if (!currentApplicant) {
    throw new Error("Current applicant not found");
  }

  const address = await getRandomAddress("us");
  const apartNumber = randomInt(1, 100).toString();
  let addressPayload;

  if (APP_CONFIG.DEFAULT_VALUES.HOUSING_TYPE === "Own my home") {
    addressPayload = {
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
  } else {
    const leaseDocumentAssetId = await uploadLeaseAgreement(
      api,
      app,
      "./test-data/LeaseAgreement.pdf"
    );
    addressPayload = {
      data: {
        address: [
          {
            housing_type: APP_CONFIG.DEFAULT_VALUES.HOUSING_TYPE,
            rent: {
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
              monthly_payment: randomInt(1000, 3000),
              reason_for_leaving: "Why not?",
              landlord_name: "Franky",
              landlord_email: "andrii+ll@boompay.app",
              landlord_phone: "+14324536345",
              lease_document: [leaseDocumentAssetId],
            },
          },
        ],
      },
    };
  }

  await api.providePersonalDetailsSteps(
    app.id!,
    app.verifications!.housing_history!,
    APP_CONFIG.STEP_NAMES.HOUSING_HISTORY,
    addressPayload
  );
  logger.info(`Submitted housing history`);
}

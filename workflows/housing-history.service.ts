import { APP_CONFIG } from "../config";
import { LoggerProvider } from "../services";
import { getRandomAddress, randomInt } from "../helpers";
import { uploadLeaseAgreement } from "./document-upload.service";
import { getApplicant, RunContext } from "./run-context";

const logger = LoggerProvider.create("application-housing-history");

export async function submitHousingHistory(ctx: RunContext): Promise<void> {
  getApplicant(ctx);

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
      ctx.api,
      ctx.app,
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

  await ctx.api.providePersonalDetailsSteps(
    ctx.app.id!,
    ctx.app.verifications!.housing_history!,
    APP_CONFIG.STEP_NAMES.HOUSING_HISTORY,
    addressPayload
  );
  logger.info(`Submitted housing history`);
}

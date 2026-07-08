import { ApiClient } from "../services";
import { AppInfo } from "../models";
import { APP_CONFIG, INCOME_SOURCE_DETAILS } from "../config";
import { LoggerProvider } from "../services";
import { generateEmployeeData } from "../helpers";
import { uploadDocument } from "./document-upload.service";

const logger = LoggerProvider.create("application-combined-income");

export async function submitCombinedIncome(
  api: ApiClient,
  app: AppInfo,
  _applicantIndex = 0
): Promise<void> {
  const employee = generateEmployeeData();
  const employmentPayload = {
    type: "self_employment",
    start_date: employee.startDate,
    additional_data: {
      company_name: employee.company,
      job_title: employee.jobTitle,
    },
    amount: {
      cents: employee.monthlySalary * 100,
      currency: "USD",
    },
    pay_period: "monthly",
  };

  const incomeVResponse = await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "income",
    employmentPayload
  );
  const incomeVerificationDetails = await incomeVResponse.json();
  app.incomeId = incomeVerificationDetails.id;
  logger.info(
    `Submitted first part of combined income verification: ${app.incomeId}`
  );

  const incomeSourceConfig =
    INCOME_SOURCE_DETAILS[APP_CONFIG.DEFAULT_VALUES.INCOME_SOURCE];

  const incomeSourcePayload = {
    income_id: app.incomeId,
    type: incomeSourceConfig.apiType,
  };

  const incomeSourceResponse = await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "income_sources",
    incomeSourcePayload
  );
  const incomeSourceDetails = await incomeSourceResponse.json();
  app.incomeSourceId = incomeSourceDetails.id;
  logger.info(
    `Submitted second part of combined income verification: ${app.incomeSourceId}`
  );

  await uploadDocument(
    api,
    app,
    incomeSourceConfig.filePath,
    incomeSourceConfig.documentType
  );

  await api.postIncomeVerificationDetails(
    app.id!,
    app.verifications!.combined_income!,
    "finish"
  );
}

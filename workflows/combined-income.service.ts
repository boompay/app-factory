import { APP_CONFIG, INCOME_SOURCE_DETAILS } from "../config";
import { LoggerProvider } from "../services";
import { generateEmployeeData } from "../helpers";
import { uploadDocument } from "./document-upload.service";
import { RunContext } from "./run-context";

const logger = LoggerProvider.create("application-combined-income");

export async function submitCombinedIncome(ctx: RunContext): Promise<void> {
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

  const incomeVResponse = await ctx.api.postIncomeVerificationDetails(
    ctx.app.id!,
    ctx.app.verifications!.combined_income!,
    "income",
    employmentPayload
  );
  const incomeVerificationDetails = await incomeVResponse.json();
  ctx.app.incomeId = incomeVerificationDetails.id;
  logger.info(
    `Submitted first part of combined income verification: ${ctx.app.incomeId}`
  );

  const incomeSourceConfig =
    INCOME_SOURCE_DETAILS[APP_CONFIG.DEFAULT_VALUES.INCOME_SOURCE];

  const incomeSourcePayload = {
    income_id: ctx.app.incomeId,
    type: incomeSourceConfig.apiType,
  };

  const incomeSourceResponse = await ctx.api.postIncomeVerificationDetails(
    ctx.app.id!,
    ctx.app.verifications!.combined_income!,
    "income_sources",
    incomeSourcePayload
  );
  const incomeSourceDetails = await incomeSourceResponse.json();
  ctx.app.incomeSourceId = incomeSourceDetails.id;
  logger.info(
    `Submitted second part of combined income verification: ${ctx.app.incomeSourceId}`
  );

  await uploadDocument(
    ctx.api,
    ctx.app,
    incomeSourceConfig.filePath,
    incomeSourceConfig.documentType
  );

  await ctx.api.postIncomeVerificationDetails(
    ctx.app.id!,
    ctx.app.verifications!.combined_income!,
    "finish"
  );
}

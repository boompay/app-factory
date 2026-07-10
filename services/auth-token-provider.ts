import fs from "fs";
import { request } from "playwright";
import { Logger } from "winston";
import { LoggerProvider } from "./logger-provider";
import { generateRandomUsCaPhone, randomInt } from "../helpers/index";
import { AppInfo, getApplicantAt } from "../models";
import {
  getApplicantSignInLink,
  parseApplicantSignInLink,
} from "../utils/sign-in-link";
import { applyApplicantIdFromMagicLinkCheck } from "../utils/magic-link-check";

export class AuthTokenProvider {
  private authUrl: string;
  private phoneNumber: string;
  private OTPCode: string;
  private logger: Logger;

  constructor(authUrl: string) {
    this.authUrl = authUrl;
    this.phoneNumber = generateRandomUsCaPhone("national");
    this.OTPCode = randomInt(100000, 999999).toString();
    this.logger = LoggerProvider.create("auth-token-provider");
  }

  public async getBearerToken(applicationToken: string): Promise<AppInfo> {
    let appInfo: AppInfo;
    const currentAppPath = "./current-app.json";
    this.logger.info(
      `Requesting auth token for application token: ${applicationToken}`
    );
    const apiRequestContext = await request.newContext({
      baseURL: this.authUrl,
      extraHTTPHeaders: {
        "Content-Type": "application/json",
      },
    });

    const responseCheck = await apiRequestContext.get(
      "/screen/magic_links/check",
      {
        params: {
          token: applicationToken,
        },
      }
    );

    if (!responseCheck.ok()) {
      const errorText = await responseCheck.text();
      this.logger.error(
        `Failed to check magic link: ${responseCheck.status()} ${errorText}`
      );
      throw new Error(
        `Failed to check magic link: ${responseCheck.status()} ${errorText}`
      );
    }

    let data = await responseCheck.json();

    if (!data || !data.magic_link || !data.magic_link.unit_id) {
      this.logger.error(`Invalid magic link response: ${JSON.stringify(data)}`);
      throw new Error(
        "Invalid magic link response: missing magic_link or unit_id"
      );
    }

    const unitId = data.magic_link.unit_id;

    const responseSendOtp = await apiRequestContext.post(
      "/screen/auth/send_otp",
      {
        data: {
          phone: this.phoneNumber,
          unit_id: unitId,
          token: applicationToken,
        },
      }
    );
    data = await responseSendOtp.json().catch(() => ({} as any));
    if (!data.success) {
      this.logger.error(`Failed to send OTP: ${JSON.stringify(data)}`);
      throw new Error("Failed to send OTP");
    }

    const responseSignIn = await apiRequestContext.post(
      "/screen/auth/jwt/sign_in",
      {
        data: {
          phone: this.phoneNumber,
          otp: this.OTPCode,
        },
      }
    );
    data = await responseSignIn.json().catch(() => ({} as any));
    const bearerToken = data.access_token;
    const refreshToken = data.refresh_token;
    appInfo = {
      unit_id: unitId,
      app_token: applicationToken,
      bearer_token: bearerToken,
      refresh_token: refreshToken,
      applicants: [
        {
          phone: this.phoneNumber,
          otp: parseInt(this.OTPCode),
        },
      ],
    };
    fs.writeFileSync(currentAppPath, JSON.stringify(appInfo, null, 2), "utf-8");
    this.logger.info(`Received bearer token: ${bearerToken}`);
    this.logger.info(`Applicant phone is: ${this.phoneNumber}`);
    return appInfo;
  }

  /**
   * Authenticates a co-applicant via their dedicated sign-in URL
   * (/auth/sign-in?token=...&unitId=...&applicationId=...).
   */
  public async authenticateCoApplicant(
    signInLink: string,
    app: AppInfo,
    applicantIndex: number
  ): Promise<AppInfo> {
    const currentAppPath = "./current-app.json";
    const { token, unitId: unitIdFromLink, applicationId } =
      parseApplicantSignInLink(signInLink);

    const applicant = getApplicantAt(app, applicantIndex);
    if (!applicant) {
      throw new Error(`Applicant at index ${applicantIndex} not found`);
    }

    this.logger.info(
      `Authenticating co-applicant via sign-in link (index ${applicantIndex}, applicationId=${applicationId ?? app.id})`
    );
    this.logger.info(`Sign-in URL: ${signInLink}`);

    applicant.phone = generateRandomUsCaPhone("national");
    applicant.otp = randomInt(100000, 999999);

    const apiRequestContext = await request.newContext({
      baseURL: this.authUrl,
      extraHTTPHeaders: {
        "Content-Type": "application/json",
      },
    });

    const responseCheck = await apiRequestContext.get(
      "/screen/magic_links/check",
      {
        params: { token },
      }
    );

    if (!responseCheck.ok()) {
      const errorText = await responseCheck.text();
      this.logger.error(
        `Failed to check co-applicant sign-in token: ${responseCheck.status()} ${errorText}`
      );
      throw new Error(
        `Failed to check co-applicant sign-in token: ${responseCheck.status()} ${errorText}`
      );
    }

    const checkData = await responseCheck.json();
    applyApplicantIdFromMagicLinkCheck(applicant, checkData);
    const unitId =
      unitIdFromLink ||
      checkData?.magic_link?.unit_id ||
      app.unit_id;

    if (!unitId) {
      throw new Error("Could not resolve unit_id for co-applicant sign-in");
    }

    const responseSendOtp = await apiRequestContext.post(
      "/screen/auth/send_otp",
      {
        data: {
          phone: applicant.phone,
          unit_id: unitId,
          token,
        },
      }
    );
    const otpData = await responseSendOtp.json().catch(() => ({} as any));
    if (!otpData.success) {
      this.logger.error(`Failed to send OTP: ${JSON.stringify(otpData)}`);
      throw new Error("Failed to send OTP for co-applicant");
    }

    const responseSignIn = await apiRequestContext.post(
      "/screen/auth/jwt/sign_in",
      {
        data: {
          phone: applicant.phone,
          otp: applicant.otp,
        },
      }
    );
    const signInData = await responseSignIn.json().catch(() => ({} as any));

    app.unit_id = unitId;
    app.app_token = token;
    app.bearer_token = signInData.access_token;
    app.refresh_token = signInData.refresh_token;
    applicant.sign_in_link = signInLink;
    applicant.invite_magic_link = signInLink;

    fs.writeFileSync(currentAppPath, JSON.stringify(app, null, 2), "utf-8");
    this.logger.info(`Co-applicant authenticated. Bearer token updated.`);
    this.logger.info(`Applicant phone is: ${applicant.phone}`);

    return app;
  }

  /** @deprecated Use authenticateCoApplicant with a sign-in URL instead */
  public async updateBearerToken(
    applicationToken: string,
    app: AppInfo
  ): Promise<AppInfo> {
    const applicant = app.applicants?.find((entry) =>
      entry.invite_magic_link?.includes(applicationToken)
    );
    if (!applicant) {
      throw new Error(`Applicant not found for token: ${applicationToken}`);
    }

    const applicantIndex = app.applicants!.indexOf(applicant);
    const signInLink = getApplicantSignInLink(applicant);
    return this.authenticateCoApplicant(signInLink, app, applicantIndex);
  }
}

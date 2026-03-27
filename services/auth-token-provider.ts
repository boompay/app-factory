import fs from "fs";
import { request } from "playwright";
import { Logger } from "winston";
import { LoggerProvider } from "./logger-provider";
import { generateRandomUsCaPhone, randomInt } from "../helpers/index";
import { AppInfo } from "../models";

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
      this.logger.error(`Failed to check magic link: ${responseCheck.status()} ${errorText}`);
      throw new Error(`Failed to check magic link: ${responseCheck.status()} ${errorText}`);
    }
    
    let data = await responseCheck.json();
    
    if (!data || !data.magic_link || !data.magic_link.unit_id) {
      this.logger.error(`Invalid magic link response: ${JSON.stringify(data)}`);
      throw new Error("Invalid magic link response: missing magic_link or unit_id");
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
    // Write file for persistence, but return the data directly to avoid file I/O dependency
    fs.writeFileSync(currentAppPath, JSON.stringify(appInfo, null, 2), "utf-8");
    this.logger.info(`Received bearer token: ${bearerToken}`);
    return appInfo;
  }

  public async updateBearerToken(applicationToken: string, app: AppInfo): Promise<AppInfo> {
    const currentAppPath = "./current-app.json";
    this.logger.info(
      `Updating bearer token for application token: ${applicationToken}`
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
      this.logger.error(`Failed to check magic link: ${responseCheck.status()} ${errorText}`);
      throw new Error(`Failed to check magic link: ${responseCheck.status()} ${errorText}`);
    }
    
    let applicant = app.applicants?.find((applicant) => applicant.invite_magic_link?.includes(applicationToken));
    if (!applicant) {
      this.logger.error(`Applicant not found in app info: ${JSON.stringify(app)}`);
      throw new Error(`Applicant not found in app info: ${JSON.stringify(app)}`);
    }
    applicant.phone = generateRandomUsCaPhone("national");
    applicant.otp = randomInt(100000, 999999);

    const responseSendOtp = await apiRequestContext.post(
      "/screen/auth/send_otp",
      {
        data: {
          phone: applicant.phone,
          unit_id: app.unit_id,
          token: applicationToken,
        },
      }
    );
    let data = await responseSendOtp.json().catch(() => ({} as any));
    if (!data.success) {
      this.logger.error(`Failed to send OTP: ${JSON.stringify(data)}`);
      throw new Error("Failed to send OTP");
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
    data = await responseSignIn.json().catch(() => ({} as any));
    app.bearer_token = data.access_token;
    app.refresh_token = data.refresh_token;
    fs.writeFileSync(currentAppPath, JSON.stringify(app, null, 2), "utf-8");
    this.logger.info(`Updated bearer token: ${app.bearer_token}`);
    return app;
  }
}

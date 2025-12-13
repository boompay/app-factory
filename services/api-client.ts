import { APIRequestContext, APIResponse, request } from "playwright";

// Per-request options type from Playwright (includes `data`, `params`, `headers`, `timeout`, etc.)
type ApiRequestOptions = Parameters<APIRequestContext["get"]>[1];
import { Logger } from "winston";
import { LoggerProvider } from "./logger-provider";

export class ApiClient {
  private logger: Logger;
  private requestContext!: APIRequestContext;
  private readonly baseUrl: string;
  private bearerToken: string | undefined;
  private refreshToken: string | undefined;

  constructor(baseUrl: string, bearerToken: string, refreshToken: string) {
    this.bearerToken = bearerToken;
    this.refreshToken = refreshToken;
    this.logger = LoggerProvider.create("boomscreen-api");
    this.baseUrl = process.env.BASE_URL || baseUrl;
  }

  async init() {
    this.requestContext = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });
  }

  private async refreshTokens() {
    const response = await this.requestContext.post("/auth/refresh", {
      data: {
        refreshToken: this.refreshToken,
      },
    });

    if (!response.ok()) {
      throw new Error(
        `Failed to refresh tokens: ${response.status()} ${await response.text()}`
      );
    }

    const data = await response.json();
    this.bearerToken = data.bearerToken;
    this.refreshToken = data.refreshToken;
    this.logger.info("Tokens refreshed successfully.");

    // Update the Authorization header with the new bearer token
    this.requestContext = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });
  }

  private async executeWithTokenRefresh(
    method: "get" | "post" | "patch" | "delete" | "put",
    endpoint: string,
    options: any
  ): Promise<APIResponse> {
    let response = await this.requestContext[method](endpoint, options);

    if (response.status() !== 401) {
      if (/^[45]\d{2}$/.test(String(response.status())))
        throw new Error(
          `Request failed with status : ${response.status()}\n${await response.text()}`
        );
      return response;
    }

    this.logger.warn(
      `Received 401 Unauthorized for ${method.toUpperCase()} ${endpoint}. Refreshing tokens...`
    );
    await this.refreshTokens();
    response = await this.requestContext[method](endpoint, options);

    if (response.status() === 401) {
      this.logger.error(
        `Request to ${method.toUpperCase()} ${endpoint} failed again with 401 after token refresh.`
      );
      throw new Error(
        `Request to ${method.toUpperCase()} ${endpoint} failed with 401 Unauthorized even after token refresh.`
      );
    }

    return response;
  }

  /**
   * Makes a GET request to retrieve application details by its ID.
   * @param applicationId - The application ID
   * @returns whole application data
   */
  public async getApplicationDetails(applicationId: string): Promise<any> {
    return this.get(`/screen/applications/${applicationId}`, {
      timeout: 10000,
    } as ApiRequestOptions);
  }

  /**
   * Makes a POST request to update an application.
   * @param applicationId - the ID of the application to update
   * @param payload - the payload to update the application
   * @returns - the new application schema
   */
  public async updateApplication(
    applicationId: string,
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 30000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: payload,
      timeout: timeoutMs,
    };

    return this.post(
      `/screen/applications/${applicationId}/submit_application`,
      requestOptions
    );
  }

  /**
   * Makes a GET request to retrieve verification details by its ID.
   * @param applicationId - The application ID
   * @param verificationId - The verification ID
   * @returns whole verification data
   */
  public async getVerificationDetails(
    applicationId: string,
    verificationId: string
  ): Promise<any> {
    return this.get(
      `/screen/applications/${applicationId}/verifications/${verificationId}`,
      {
        timeout: 10000,
      } as ApiRequestOptions
    );
  }

  /**
   * Makes a POST request to provide income verification details.
   * @param applicationId - the ID of the application
   * @param verificationId - the ID of the verification
   * @param stepName - the name of the step
   * @param payload - the income verification details payload (optional)
   * @param options - the options for the request
   * @param timeoutMs - the timeout for the request
   * @returns - the income verification details schema
   */
  public async postIncomeVerificationDetails(
    applicationId: string,
    verificationId: string,
    stepName: string,
    payload?: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 10000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      timeout: timeoutMs,
    };
    
    // Only include data if payload is provided
    if (payload !== undefined) {
      requestOptions.data = payload;
    }
    
    return this.post(
      `/screen/applications/${applicationId}/verifications/${verificationId}/${stepName}`,
      requestOptions
    );
  }

  /**
   * Makes a POST request to enroll an applicant using a magic link token.
   * @param payload - enrollment payload with magic link token and applicant info
   * @returns - the new application schema
   */
  public async enrollWithMagicLink(
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 60000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: payload,
      timeout: timeoutMs,
    };

    return this.post(
      "/screen/applications/enroll_with_magic_link",
      requestOptions
    );
  }

  /**
   * Makes a POST request that triggers start an application by its ID.
   * @param applicationId - the ID of the application to start
   * @returns - the response with dedicated fields from current application
   */
  public async startApplication(applicationId: string): Promise<any> {
    return this.post(
      `/screen/applications/${applicationId}/start_application`,
      { timeout: 10000 } as ApiRequestOptions
    );
  }

  /**
   * Makes a PATCH request to to set a desired move in date.
   * @param applicationId - the ID of the application to set a desired move in date
   * @returns - the updated appliction schema
   */
  public async submitDesiredMoveInDate(applicationId: string, payload: any): Promise<any> {
    return this.patch(`/screen/applications/${applicationId}`, {
      data: payload,
      timeout: 10000,
    } as ApiRequestOptions);
  }

  /**
   * Makes a PATCH request to pass the invite flow for a given applicant ID.
   * @param applicantId - the ID of the applicant to pass the invite flow
   * @returns - the updated applicant schema
   */
  public async passInviteFlow(applicantId: string): Promise<any> {
    return this.patch(`/screen/applicants/${applicantId}/pass_invite_flow`, {
      timeout: 10000,
    } as ApiRequestOptions);
  }

  /**
   * Makes a PATCH request to provide personal details for steps of personal details modules.
   * @param applicationId - the ID of the application
   * @param verificationId - the ID of the personal details verification
   * @param stepName - the name of step
   * @param payload - the personal details payload
   * @returns - the personal details step schema
   */
  public async providePersonalDetailsSteps(
    applicationId: string,
    verificationId: string,
    stepName: string,
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 40000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: payload,
      timeout: timeoutMs,
    };

    return this.patch(
      `/screen/applications/${applicationId}/verifications/${verificationId}/steps/${stepName}`,
      requestOptions
    );
  }

  /**
   * Makes a POST request to start Fast-Track Identity Verification process.
   * @param payload - payload with application and applicant Ids
   * @returns - no content
   */
  public async createTestIdentityVerification(
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 30000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: payload,
      timeout: timeoutMs,
    };

    return this.post(
      "screen/plaid/create_test_identity_verification",
      requestOptions
    );
  }

  /**
   * Gets a presigned URL for uploading a file to S3.
   * @param filename - The filename to upload
   * @param contentType - The content type of the file (e.g., "application/pdf")
   * @returns - Presigned URL response with S3 upload details
   */
  public async getPresignedUrl(
    filename: string,
    contentType: string,
    options?: ApiRequestOptions,
    timeoutMs: number = 30000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      params: {
        filename,
        type: contentType,
      },
      timeout: timeoutMs,
    };

    return this.get("/screen/assets/presign", requestOptions);
  }

  /**
   * Uploads documents to an income source.
   * @param applicationId - The application ID
   * @param verificationId - The verification ID
   * @param incomeSourceId - The income source ID
   * @param payload - Documents payload with document_type, url, and metadata
   * @returns - Response with uploaded assets
   */
  public async uploadDocumentsToIncomeSource(
    applicationId: string,
    verificationId: string,
    incomeSourceId: string,
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 30000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: payload,
      timeout: timeoutMs,
    };

    return this.post(
      `/screen/applications/${applicationId}/verifications/${verificationId}/income_sources/${incomeSourceId}/bulk_create_documents`,
      requestOptions
    );
  }

  /**
   * Creates an asset from an uploaded file URL with retry logic for network errors.
   * @param applicationId - The application ID
   * @param payload - Asset payload with url and metadata
   * @param options - Optional request options
   * @param timeoutMs - Timeout in milliseconds (default: 60000)
   * @returns - Response with created asset including global_id
   */
  public async createAsset(
    applicationId: string,
    payload: any,
    options?: ApiRequestOptions,
    timeoutMs: number = 60000
  ): Promise<any> {
    const requestOptions: ApiRequestOptions = {
      ...(options || {}),
      data: {
        ...payload,
        application_id: applicationId,
      },
      timeout: timeoutMs,
    };

    const { withRetry } = await import("../utils/retry");
    
    return withRetry(
      () => {
        this.logger.info("Creating asset");
        return this.post("/screen/assets", requestOptions);
      },
      {
        onRetry: (attempt) => {
          this.logger.info(`Retrying asset creation (attempt ${attempt})`);
        },
      }
    );
  }

  async get(endpoint: string, options?: any) {
    return this.executeWithTokenRefresh("get", endpoint, options);
  }

  async post(endpoint: string, options?: any) {
    return this.executeWithTokenRefresh("post", endpoint, options);
  }

  async put(endpoint: string, options?: any) {
    return this.executeWithTokenRefresh("put", endpoint, options);
  }

  async delete(endpoint: string, options?: any) {
    return this.executeWithTokenRefresh("delete", endpoint, options);
  }

  async patch(endpoint: string, options?: any) {
    return this.executeWithTokenRefresh("patch", endpoint, options);
  }
}

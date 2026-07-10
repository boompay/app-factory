import { ApiClient } from "../services";
import { LoggerProvider } from "../services";
import { AppInfo } from "../models";
import {
  readFileAsBuffer,
  uploadFileToS3Bucket,
  PresignResponse,
} from "../utils";
import { CONTENT_TYPES } from "../constants";

const logger = LoggerProvider.create("application-personal-details");

type UploadedFileInfo = {
  url: string;
  size: number;
  filename: string;
  contentType: string;
};

async function presignAndUploadFile(
  api: ApiClient,
  filePath: string,
  explicitContentType?: string
): Promise<UploadedFileInfo> {
  const filename = filePath.split(/[/\\]/).pop() || "document";

  const inferredContentType =
    explicitContentType ??
    (filename.endsWith(".pdf")
      ? CONTENT_TYPES.PDF
      : filename.endsWith(".svg")
        ? "image/svg+xml"
        : CONTENT_TYPES.OCTET_STREAM);

  logger.info(`Getting presigned URL for file: ${filename}`);
  const presignResponse = await api.getPresignedUrl(
    filename,
    inferredContentType
  );
  const presignData: PresignResponse = await presignResponse.json();

  if (!presignData.url) {
    throw new Error("Failed to get presigned URL: missing url in response");
  }

  logger.info(`Reading file from: ${filePath}`);
  const fileBuffer = await readFileAsBuffer(filePath);
  const fileSize = fileBuffer.length;

  logger.info(`Uploading file to S3: ${presignData.url}`);
  await uploadFileToS3Bucket(presignData.url, fileBuffer, inferredContentType);
  logger.info(`File uploaded successfully to S3`);

  return {
    url: presignData.url,
    size: fileSize,
    filename,
    contentType: inferredContentType,
  };
}

export async function uploadSignature(
  api: ApiClient,
  app: AppInfo,
  filePath: string
): Promise<string> {
  const uploaded = await presignAndUploadFile(api, filePath, "image/svg+xml");

  const assetPayload = {
    url: uploaded.url,
    metadata: {
      size: uploaded.size,
      original_filename: uploaded.filename,
      content_type: uploaded.contentType,
    },
  };

  logger.info(`Creating asset record for signature`);
  try {
    const assetResponse = await api.createAsset(app.id!, assetPayload, undefined, 60000);
    const assetData = await assetResponse.json();

    if (assetData.asset?.global_id) {
      logger.info(
        `Signature asset created successfully. Asset ID: ${assetData.asset.global_id}`
      );
      return assetData.asset.global_id;
    }

    logger.error(
      `Failed to get asset ID from asset response: ${JSON.stringify(assetData)}`
    );
    throw new Error("Failed to get asset ID from asset creation response");
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    logger.error(`Failed to create signature asset after retries: ${errorMessage}`);
    throw new Error(`Signature asset creation failed: ${errorMessage}`);
  }
}

export async function uploadLeaseAgreement(
  api: ApiClient,
  app: AppInfo,
  filePath: string
): Promise<string> {
  const uploaded = await presignAndUploadFile(api, filePath, "application/pdf");

  const assetPayload = {
    url: uploaded.url,
    metadata: {
      size: uploaded.size,
      original_filename: uploaded.filename,
      content_type: uploaded.contentType,
    },
  };

  logger.info(`Creating asset record for LeaseAgreement`);
  try {
    const assetResponse = await api.createAsset(app.id!, assetPayload, undefined, 60000);
    const assetData = await assetResponse.json();

    if (assetData.asset?.global_id) {
      logger.info(
        `LeaseAgreement asset created successfully. Asset ID: ${assetData.asset.global_id}`
      );
      return assetData.asset.global_id;
    }

    logger.error(
      `Failed to get asset ID from asset response: ${JSON.stringify(assetData)}`
    );
    throw new Error(
      "Failed to get asset ID from LeaseAgreement asset creation response"
    );
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    logger.error(
      `Failed to create LeaseAgreement asset after retries: ${errorMessage}`
    );
    throw new Error(`LeaseAgreement asset creation failed: ${errorMessage}`);
  }
}

export async function uploadDocument(
  api: ApiClient,
  app: AppInfo,
  filePath: string,
  documentType: string
): Promise<string> {
  if (!app.incomeSourceId) {
    throw new Error("incomeSourceId is required for document upload");
  }

  const uploaded = await presignAndUploadFile(api, filePath);

  const documentPayload = {
    documents: [
      {
        document_type: documentType,
        url: uploaded.url,
        metadata: {
          size: uploaded.size,
          original_filename: uploaded.filename,
          content_type: uploaded.contentType,
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
    logger.info(
      `Document uploaded successfully. Asset ID: ${documentData.assets.items[0].global_id}`
    );
    return documentData.assets.items[0].global_id;
  }

  logger.warn("Document upload completed but no assets returned in response");
  throw new Error("Failed to get asset ID from document upload response");
}

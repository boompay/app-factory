import fs from "fs/promises";
import path from "path";
import fetch, { Response } from "node-fetch";
import { AppInfo } from "../models";

export async function readAppInfo(filePath: string): Promise<AppInfo> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const app = JSON.parse(content);
    if (!app || typeof app !== "object") {
      throw new Error("Invalid app info format");
    }
    return app as AppInfo;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read app info from ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to read app info from ${filePath}: ${String(error)}`);
  }
}

export async function writeAppInfo(filePath: string, app: AppInfo): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(app, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`Failed to write app info to ${filePath}: ${error}`);
  }
}

export async function writeTestData(filePath: string, data: any): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`Failed to write test data to ${filePath}: ${error}`);
  }
}

export async function clearLogFiles(): Promise<void> {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    
    // Check if logs directory exists
    try {
      await fs.access(logsDir);
    } catch {
      // Directory doesn't exist, nothing to clear
      return;
    }

    // Read all files in the logs directory
    const files = await fs.readdir(logsDir);
    
    // Delete all .log files
    const deletePromises = files
      .filter((file) => file.endsWith(".log"))
      .map((file) => fs.unlink(path.join(logsDir, file)));
    
    await Promise.all(deletePromises);
  } catch (error) {
    // Log error but don't throw - we don't want to fail the run if log clearing fails
    console.warn(`Warning: Failed to clear log files: ${error}`);
  }
}

/**
 * Interface for file metadata
 */
export interface FileMetadata {
  size: number;
  original_filename: string;
  content_type: string;
}

/**
 * Interface for document upload result
 */
export interface DocumentUploadResult {
  document_type: string;
  url: string;
  metadata: FileMetadata;
}

/**
 * Interface for presign response
 */
export interface PresignResponse {
  fields: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  url: string;
}

/**
 * Uploads a file to an S3 bucket using a presigned URL
 * @param s3Url - The presigned S3 URL
 * @param fileBuffer - The file buffer, Blob, or ArrayBuffer to upload
 * @param contentType - Optional content type for the file
 * @returns Promise resolving to the response with the uploaded file URL
 */
export async function uploadFileToS3Bucket(
  s3Url: string,
  fileBuffer: Buffer | Blob | ArrayBuffer | Uint8Array,
  contentType?: string
): Promise<Response> {
  try {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    // node-fetch accepts Buffer, Blob, ArrayBuffer, and Uint8Array
    // TypeScript's type definitions are strict, but node-fetch handles these at runtime
    const response = await fetch(s3Url, {
      method: "PUT",
      body: fileBuffer as Buffer | Blob,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload file to S3: ${response.status} ${response.statusText}`
      );
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
    throw new Error(`S3 upload failed: ${String(error)}`);
  }
}

/**
 * Reads a file from the filesystem and returns it as a Buffer
 * @param filePath - Path to the file
 * @returns Promise resolving to the file buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to read file ${filePath}: ${String(error)}`);
  }
}

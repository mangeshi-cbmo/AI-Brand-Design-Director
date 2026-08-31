import { Storage } from "@google-cloud/storage";

const GCS_BUCKET_NAME =
  process.env.GCS_BUCKET_NAME ||
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET ||
  "ai-brand-assets-director";

const GCP_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCP_PROJECT_ID ||
  "ai-brand-design-director";

let storageClient: Storage | null = null;

export function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage({
      projectId: GCP_PROJECT_ID,
    });
  }
  return storageClient;
}

export interface UploadAssetParams {
  data: string | Buffer; // base64 data URL, SVG string, or Buffer
  brandName?: string;
  userEmail?: string;
  extension?: string;
  contentType?: string;
  folder?: string;
}

export interface UploadAssetResult {
  gcsUrl: string;
  gcsPath: string;
  bucket: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Upload a logo image or vector asset directly to Google Cloud Storage
 * (gs://ai-brand-assets-director/logos/...)
 */
export async function uploadLogoAsset(params: UploadAssetParams): Promise<UploadAssetResult> {
  const storage = getStorageClient();
  const bucket = storage.bucket(GCS_BUCKET_NAME);

  let buffer: Buffer;
  let mimeType = params.contentType || "image/png";
  let ext = params.extension || "png";

  if (Buffer.isBuffer(params.data)) {
    buffer = params.data;
  } else if (typeof params.data === "string") {
    if (params.data.startsWith("data:")) {
      // Parse data URL (e.g. data:image/png;base64,... or data:image/svg+xml;utf8,...)
      const match = params.data.match(/^data:([^;]+);(base64|utf8)?,?([\s\S]*)$/i);
      if (match) {
        mimeType = match[1] || mimeType;
        const encoding = match[2] || "base64";
        const rawContent = match[3] || "";

        if (mimeType.includes("svg")) {
          ext = "svg";
        } else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
          ext = "jpg";
        } else if (mimeType.includes("webp")) {
          ext = "webp";
        } else {
          ext = "png";
        }

        if (encoding === "base64") {
          buffer = Buffer.from(rawContent, "base64");
        } else {
          // URL-decoded UTF-8 string (common for SVG data URLs)
          buffer = Buffer.from(decodeURIComponent(rawContent), "utf-8");
        }
      } else {
        // Fallback standard base64 without prefix
        buffer = Buffer.from(params.data, "base64");
      }
    } else if (params.data.trim().startsWith("<svg") || params.data.includes("<svg")) {
      // Direct SVG markup string
      mimeType = "image/svg+xml";
      ext = "svg";
      buffer = Buffer.from(params.data, "utf-8");
    } else {
      // Raw string buffer
      buffer = Buffer.from(params.data, "utf-8");
    }
  } else {
    throw new Error("Invalid asset data provided for GCS upload");
  }

  // Sanitize user subfolder and brand filename
  const userFolder = (params.userEmail || "guest")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 40);

  const brandSlug = (params.brandName || "logo")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 30) || "logo";

  const folder = params.folder || "logos";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const cleanExt = ext.replace(/^\./, "");
  const gcsPath = `${folder}/${userFolder}/${brandSlug}_${timestamp}_${randomSuffix}.${cleanExt}`;

  const file = bucket.file(gcsPath);

  // Save the buffer to GCS
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        brandName: params.brandName || "Logo",
        userEmail: params.userEmail || "guest",
        uploadedAt: new Date().toISOString(),
      },
    },
    resumable: false,
  });

  const gcsUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;

  return {
    gcsUrl,
    gcsPath,
    bucket: GCS_BUCKET_NAME,
    mimeType,
    fileSize: buffer.length,
  };
}

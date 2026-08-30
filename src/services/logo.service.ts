import { LogoModel } from "@/lib/db/models/logo.model";
import { uploadLogoAsset } from "@/lib/storage/gcs";
import { ColorPalette, GeneratedLogo, LogoData, LogoGenerationParams, LogoStyle } from "@/types/logo";

export class LogoService {
  /**
   * Fetch logos from MongoDB Atlas 'logos' collection with optional id/email filtering and limit
   */
  static async getAllLogos(userEmail?: string, ids?: string[], limit: number = 60): Promise<GeneratedLogo[]> {
    try {
      const filter: Record<string, unknown> = {};
      if (ids && ids.length > 0) {
        filter._id = { $in: ids };
      } else if (userEmail) {
        filter.userEmail = userEmail;
      }

      const docs = await LogoModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return docs.map((doc) => ({
        id: String(doc._id),
        brandName: doc.brandName || "Brand Logo",
        slogan: doc.slogan,
        imageUrl: doc.gcsUrl || doc.imageUrl,
        gcsUrl: doc.gcsUrl,
        gcsPath: doc.gcsPath,
        gcsBucket: doc.gcsBucket,
        style: (doc.style as LogoStyle) || "minimalist",
        colorPalette: (doc.colorPalette as ColorPalette) || "monochrome",
        promptUsed: doc.promptUsed || "",
        logoData: doc.logoData as LogoData | undefined,
        createdAt: new Date(doc.createdAt),
      }));
    } catch (error) {
      console.error("Error fetching logos from MongoDB Atlas:", error);
      return [];
    }
  }

  /**
   * Save a newly generated logo:
   * 1. Uploads the image / preview asset to Google Cloud Storage (gs://ai-brand-assets-director)
   * 2. Saves complete brand metadata and permanent GCS URL to MongoDB Atlas 'logos' collection
   */
  static async saveLogo(
    params: LogoGenerationParams,
    imageUrl: string,
    promptUsed: string,
    userEmail?: string,
    logoData?: LogoData
  ): Promise<GeneratedLogo> {
    let finalImageUrl = imageUrl;
    let gcsUrl: string | undefined;
    let gcsPath: string | undefined;
    let gcsBucket: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;

    // Upload to Google Cloud Storage if imageUrl contains image data or if we have an asset
    try {
      if (imageUrl && (imageUrl.startsWith("data:") || imageUrl.startsWith("<svg"))) {
        const uploadResult = await uploadLogoAsset({
          data: imageUrl,
          brandName: params.brandName,
          userEmail,
        });

        gcsUrl = uploadResult.gcsUrl;
        gcsPath = uploadResult.gcsPath;
        gcsBucket = uploadResult.bucket;
        mimeType = uploadResult.mimeType;
        fileSize = uploadResult.fileSize;
        finalImageUrl = uploadResult.gcsUrl; // Use permanent GCS URL as primary image URL
      }
    } catch (gcsError) {
      console.error("Warning: Failed to upload logo asset to Google Cloud Storage, proceeding with inline URI:", gcsError);
    }

    try {
      const newDoc = await LogoModel.create({
        brandName: params.brandName,
        slogan: params.slogan,
        imageUrl: finalImageUrl,
        gcsUrl,
        gcsPath,
        gcsBucket,
        mimeType,
        fileSize,
        style: params.style,
        colorPalette: params.colorPalette,
        promptUsed,
        industry: params.industry,
        concept: params.conceptDescription,
        userEmail: userEmail || "guest@logoforge.ai",
        logoData: logoData ? (logoData as unknown as Record<string, unknown>) : undefined,
      });

      return {
        id: String(newDoc._id),
        brandName: newDoc.brandName,
        slogan: newDoc.slogan,
        imageUrl: newDoc.imageUrl,
        gcsUrl: newDoc.gcsUrl,
        gcsPath: newDoc.gcsPath,
        gcsBucket: newDoc.gcsBucket,
        style: newDoc.style as LogoStyle,
        colorPalette: newDoc.colorPalette as ColorPalette,
        promptUsed: newDoc.promptUsed,
        logoData: newDoc.logoData as LogoData | undefined,
        createdAt: new Date(newDoc.createdAt),
      };
    } catch (error) {
      console.error("Error saving logo to MongoDB Atlas:", error);
      // Fallback in-memory object if DB network is unreachable
      return {
        id: `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brandName: params.brandName,
        slogan: params.slogan,
        imageUrl: finalImageUrl,
        gcsUrl,
        gcsPath,
        gcsBucket,
        style: params.style,
        colorPalette: params.colorPalette,
        promptUsed,
        logoData,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Delete a logo by ID, scoped to its owner
   */
  static async deleteLogo(id: string, userEmail?: string): Promise<boolean> {
    try {
      const filter: Record<string, unknown> = { _id: id };
      if (userEmail) filter.userEmail = userEmail;
      const res = await LogoModel.deleteOne(filter);
      return res.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting logo from MongoDB Atlas:", error);
      return false;
    }
  }

  /**
   * Batch delete multiple logos by IDs, scoped to their owner
   */
  static async deleteLogos(ids: string[], userEmail?: string): Promise<number> {
    try {
      if (!ids || ids.length === 0) return 0;
      const filter: Record<string, unknown> = { _id: { $in: ids } };
      if (userEmail) filter.userEmail = userEmail;
      const res = await LogoModel.deleteMany(filter);
      return res.deletedCount;
    } catch (error) {
      console.error("Error batch deleting logos from MongoDB Atlas:", error);
      return 0;
    }
  }

  /**
   * Get logo by ID
   */
  static async getLogoById(id: string): Promise<GeneratedLogo | null> {
    try {
      const doc = await LogoModel.findById(id).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        brandName: doc.brandName || "Brand Logo",
        slogan: doc.slogan,
        imageUrl: doc.gcsUrl || doc.imageUrl,
        gcsUrl: doc.gcsUrl,
        gcsPath: doc.gcsPath,
        gcsBucket: doc.gcsBucket,
        style: (doc.style as LogoStyle) || "minimalist",
        colorPalette: (doc.colorPalette as ColorPalette) || "monochrome",
        promptUsed: doc.promptUsed || "",
        logoData: doc.logoData as LogoData | undefined,
        createdAt: new Date(doc.createdAt),
      };
    } catch (error) {
      console.error("Error fetching logo by ID:", error);
      return null;
    }
  }
}

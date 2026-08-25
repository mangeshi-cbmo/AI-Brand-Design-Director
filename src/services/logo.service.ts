import { connectDB } from "@/lib/db/client";
import { LogoModel } from "@/lib/db/models/logo.model";
import { GeneratedLogo, LogoGenerationParams } from "@/types/logo";

export class LogoService {
  /**
   * Fetch all logos from MongoDB Atlas 'logo' database
   */
  static async getAllLogos(userEmail?: string): Promise<GeneratedLogo[]> {
    try {
      await connectDB();
      const filter = userEmail ? { userEmail } : {};
      const docs = await LogoModel.find(filter).sort({ createdAt: -1 }).lean();

      return docs.map((doc) => ({
        id: String(doc._id),
        brandName: doc.brandName,
        imageUrl: doc.imageUrl,
        style: doc.style as any,
        colorPalette: doc.colorPalette as any,
        promptUsed: doc.promptUsed,
        createdAt: new Date(doc.createdAt),
      }));
    } catch (error) {
      console.error("Error fetching logos from MongoDB Atlas:", error);
      return [];
    }
  }

  /**
   * Save a newly generated logo to MongoDB Atlas 'logo' database
   */
  static async saveLogo(
    params: LogoGenerationParams,
    imageUrl: string,
    promptUsed: string,
    userEmail?: string
  ): Promise<GeneratedLogo> {
    try {
      await connectDB();
      const newDoc = await LogoModel.create({
        brandName: params.brandName,
        imageUrl,
        style: params.style,
        colorPalette: params.colorPalette,
        promptUsed,
        industry: params.industry,
        concept: params.conceptDescription,
        userEmail: userEmail || "guest@logoforge.ai",
      });

      return {
        id: String(newDoc._id),
        brandName: newDoc.brandName,
        imageUrl: newDoc.imageUrl,
        style: newDoc.style as any,
        colorPalette: newDoc.colorPalette as any,
        promptUsed: newDoc.promptUsed,
        createdAt: new Date(newDoc.createdAt),
      };
    } catch (error) {
      console.error("Error saving logo to MongoDB Atlas:", error);
      // Fallback in-memory object if DB network is unreachable
      return {
        id: `logo_${Date.now()}`,
        brandName: params.brandName,
        imageUrl,
        style: params.style,
        colorPalette: params.colorPalette,
        promptUsed,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Get logo by ID
   */
  static async getLogoById(id: string): Promise<GeneratedLogo | null> {
    try {
      await connectDB();
      const doc = await LogoModel.findById(id).lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        brandName: doc.brandName,
        imageUrl: doc.imageUrl,
        style: doc.style as any,
        colorPalette: doc.colorPalette as any,
        promptUsed: doc.promptUsed,
        createdAt: new Date(doc.createdAt),
      };
    } catch (error) {
      console.error("Error fetching logo by ID:", error);
      return null;
    }
  }
}

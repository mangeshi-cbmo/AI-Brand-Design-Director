import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTOTPSecret, TotpStorageError } from "@/lib/auth/totp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const { secret, qrCodeUrl, isNew } = await getOrCreateTOTPSecret(email);

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        isNew,
      },
    });
  } catch (error) {
    console.error("Error setting up TOTP:", error);

    if (error instanceof TotpStorageError) {
      return NextResponse.json(
        {
          success: false,
          error: "The authenticator service is temporarily unavailable. Please try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to setup Google Authenticator" },
      { status: 500 }
    );
  }
}

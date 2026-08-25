import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

// In-memory persistent secret store (maps email -> TOTP secret)
const userSecretStore = new Map<string, string>();

/**
 * Generate a new TOTP secret or retrieve existing secret for an email
 */
export async function getOrCreateTOTPSecret(email: string): Promise<{ secret: string; qrCodeUrl: string; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  const existingSecret = userSecretStore.get(normalizedEmail);

  if (existingSecret) {
    const otpauth = generateURI({
      secret: existingSecret,
      label: normalizedEmail,
      issuer: "LogoForge",
    });

    const qrCodeUrl = await QRCode.toDataURL(otpauth, {
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return { secret: existingSecret, qrCodeUrl, isNew: false };
  }

  // Generate standard base32 secret
  const newSecret = generateSecret();
  userSecretStore.set(normalizedEmail, newSecret);

  const otpauth = generateURI({
    secret: newSecret,
    label: normalizedEmail,
    issuer: "LogoForge",
  });

  const qrCodeUrl = await QRCode.toDataURL(otpauth, {
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return { secret: newSecret, qrCodeUrl, isNew: true };
}

/**
 * Verify a 6-digit TOTP code against the user's secret
 */
export function verifyTOTPToken(email: string, token: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const secret = userSecretStore.get(normalizedEmail);

  if (!secret) {
    return false;
  }

  try {
    const result = verifySync({
      token: token.trim(),
      secret: secret,
      epochTolerance: 30, // 30s window tolerance
    });
    return !!result.valid;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

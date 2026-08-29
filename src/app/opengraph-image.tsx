import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const alt = "LogoForge AI - AI Brand Architect & Vector Logo Studio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          backgroundImage:
            "radial-gradient(circle at 50% 20%, rgba(120, 119, 198, 0.18) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontSize: "28px",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: "700",
              letterSpacing: "-0.03em",
              color: "#f5f5f5",
            }}
          >
            {siteConfig.name}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "920px",
          }}
        >
          <h1
            style={{
              fontSize: "54px",
              fontWeight: "800",
              lineHeight: 1.15,
              letterSpacing: "-0.04em",
              margin: 0,
              color: "#ffffff",
            }}
          >
            AI Brand Architect & Vector Logo Studio
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#a1a1aa",
              marginTop: "20px",
              lineHeight: 1.4,
            }}
          >
            Generate intelligent brand identities, production-grade vector marks, and complete design systems.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "36px",
          }}
        >
          {["Vector Marks", "Brand Guidelines", "Design Systems", "Color Matrix"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  padding: "8px 18px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#d4d4d8",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

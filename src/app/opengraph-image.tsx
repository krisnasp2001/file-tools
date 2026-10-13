import { ImageResponse } from "next/og";


export const alt = "File Tools - Free Browser-Based File Utilities";
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
          display: "flex",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "64px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              F
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              File Tools
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(37, 99, 235, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "9999px",
              padding: "8px 18px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#60a5fa",
            }}
          >
            100% Client-Side • Private & Free
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "#f8fafc",
            }}
          >
            Fast, browser-based file utilities without server uploads.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Convert images, merge & edit PDFs, trim media, and process documents securely right in your browser.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            {["PDF", "Image", "Audio & Video", "Document", "Data"].map((tag) => (
              <div
                key={tag}
                style={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "16px",
                  color: "#d4d4d8",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          <span
            style={{
              fontSize: "18px",
              color: "#71717a",
            }}
          >
            No intrusive ads • No tracking
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Ang Li | Teaching, AI, and Community";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#FAFAF9",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 600px)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "8px",
            borderRadius: "9999px",
            backgroundColor: "#2563EB",
            marginBottom: "40px",
          }}
        />
        <div
          style={{
            fontSize: "96px",
            fontWeight: 700,
            color: "#1a1a2e",
            fontFamily: "Georgia, serif",
            lineHeight: 1.05,
          }}
        >
          Ang Li
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "40px",
            color: "#4a5568",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          Teaching, AI, and Community
        </div>
        <div
          style={{
            marginTop: "56px",
            fontSize: "28px",
            color: "#2563EB",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          angli.site
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

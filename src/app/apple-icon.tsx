import { ImageResponse } from "next/og";

// Apple touch icon: the same ink monogram as app/icon.svg, rendered to PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12141a",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path
            fill="#fbfaf7"
            d="M8 7H24.5V10L13.2 22H21V19.5H24.5V25H7.5V22L18.8 10H11V12.5H8Z"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}

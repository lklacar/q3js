import { ImageResponse } from "next/og";

export const socialImageAlt = "Q3JS — Play Quake III Arena in your browser";
export const socialImageSize = { width: 1200, height: 630 };
export const socialImageContentType = "image/png";

export function createSocialImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#151515",
        color: "#f1f1f1",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        width: "100%",
      }}
    >
      <div style={{ background: "#d94a36", display: "flex", width: 20 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px 84px 64px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
          <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: -4 }}>Q3JS</div>
          <div style={{ color: "#999", fontFamily: "monospace", fontSize: 19 }}>0.0.1</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 62,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.08,
            }}
          >
            <div>Quake III Arena</div>
            <div>in your browser</div>
          </div>
          <div style={{ color: "#aaa", fontSize: 25 }}>
            No install · Online servers · WebAssembly
          </div>
        </div>
        <div style={{ color: "#d94a36", fontFamily: "monospace", fontSize: 20, letterSpacing: 2 }}>
          Q3JS.COM
        </div>
      </div>
    </div>,
    socialImageSize,
  );
}

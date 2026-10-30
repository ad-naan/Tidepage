import { ImageResponse } from "next/og";
export const alt = "adnaan · Tidepage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "86px",
        background: "#f7f5ef",
        color: "#343a36",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 90,
          fontStyle: "italic",
          letterSpacing: -5,
        }}
      >
        adnaan<span style={{ color: "#d68549", marginLeft: 8 }}>⌁</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 27,
          marginTop: 28,
          color: "#7c8178",
        }}
      >
        Notes on code, product &amp; everyday life.
      </div>
      <div
        style={{
          display: "flex",
          width: 420,
          height: 1,
          background: "#d68549",
          marginTop: 48,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 115,
          top: 110,
          width: 115,
          height: 115,
          borderRadius: "50%",
          background: "#f0c7a2",
          border: "1px solid #d68549",
        }}
      />
    </div>,
    size,
  );
}

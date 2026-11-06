import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const alt = "光阴副本集 · adnaan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function OpenGraphImage() {
  const signature = await readFile(
    join(process.cwd(), "public/brand/adnaan-signature.png"),
  );
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
      <img
        src={`data:image/png;base64,${signature.toString("base64")}`}
        width={400}
        height={110}
        alt="adnaan"
        style={{ objectFit: "contain", objectPosition: "left" }}
      />
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

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const size = {
  width: 1200,
  height: 630,
};

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 3).trimEnd()}...` : value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = truncate(searchParams.get("title") || "GSTECHKH", 120);
  const subtitle = truncate(searchParams.get("subtitle") || "Digital products, tools, and courses", 220);
  const kind = (searchParams.get("kind") || "share").toUpperCase();
  const label = truncate(searchParams.get("label") || kind, 36);
  const price = truncate(searchParams.get("price") || "", 24);
  const image = searchParams.get("image")?.trim() || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #eef5ff 0%, #f8fbff 42%, #f8f2ff 100%)",
          position: "relative",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 32%), radial-gradient(circle at top right, rgba(147,51,234,0.18), transparent 32%)",
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: 32,
            gap: 28,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              borderRadius: 32,
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: "0 24px 60px rgba(15,23,42,0.14)",
              border: "1px solid rgba(148,163,184,0.18)",
            }}
          >
            {image ? (
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  width: "100%",
                  height: 430,
                }}
              >
                <img
                  src={image}
                  alt={title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.08) 45%, rgba(15,23,42,0.36) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 26,
                    left: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 18px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.92)",
                    color: "#0f172a",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
                {price ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 26,
                      bottom: 26,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "14px 20px",
                      borderRadius: 20,
                      background: "linear-gradient(135deg, #f59e0b, #fb7185)",
                      color: "#ffffff",
                      fontSize: 32,
                      fontWeight: 900,
                      boxShadow: "0 14px 30px rgba(244,114,182,0.3)",
                    }}
                  >
                    {price}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 430,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
                  color: "#1e293b",
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 58, fontWeight: 900, marginBottom: 14 }}>GSTECHKH</div>
                <div style={{ fontSize: 32, lineHeight: 1.25, textAlign: "center" }}>{title}</div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                padding: "24px 30px 28px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  marginBottom: 14,
                  color: "#2563eb",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                <div style={{ display: "flex" }}>gstechkh.com</div>
                <div style={{ display: "flex", color: "#64748b", fontSize: 18, fontWeight: 700 }}>
                  {kind}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  color: "#0f172a",
                  fontSize: 38,
                  lineHeight: 1.16,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: "flex",
                  color: "#334155",
                  fontSize: 23,
                  lineHeight: 1.34,
                  marginBottom: 0,
                  maxHeight: 94,
                  overflow: "hidden",
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

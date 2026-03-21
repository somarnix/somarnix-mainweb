import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

const size = {
  width: 1200,
  height: 630,
};

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 3).trimEnd()}...` : value;
}

function ensureAbsoluteUrl(value: string | null, origin: string) {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  try {
    return new URL(raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`, origin).toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const title = truncate(searchParams.get("title") || "GSTECHKH", 80);
  const subtitle = truncate(
    searchParams.get("subtitle") || "Digital products, tools, and courses on GSTECHKH",
    180
  );
  const kind = truncate((searchParams.get("kind") || "share").toUpperCase(), 18);
  const label = truncate(searchParams.get("label") || kind, 28);
  const price = truncate(searchParams.get("price") || "", 24);
  const comparePrice = truncate(searchParams.get("comparePrice") || "", 24);
  const sellerName = truncate(searchParams.get("sellerName") || "GSTECHKH", 42);
  const stockBadge = truncate(searchParams.get("stockBadge") || "", 22);
  const pageUrl = searchParams.get("url")?.trim() || origin;
  const domain = truncate(searchParams.get("domain") || "GSTECHKH.COM", 28);
  const image = ensureAbsoluteUrl(searchParams.get("image"), origin);
  const sellerLogo = ensureAbsoluteUrl(searchParams.get("sellerLogo"), origin);
  const siteLogo = ensureAbsoluteUrl("/khqr-assets/gstechkh-logo.png", origin);
  const qrDataUrl = await QRCode.toDataURL(pageUrl, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "H",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #eef4ff 0%, #f8fbff 44%, #f5efff 100%)",
          position: "relative",
          fontFamily: "Arial, sans-serif",
          padding: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(147,51,234,0.12), transparent 30%)",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: 34,
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(15,23,42,0.14)",
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          {image ? (
            <div
              style={{
                position: "relative",
                display: "flex",
                width: "100%",
                height: 348,
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
                    "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.06) 44%, rgba(15,23,42,0.3) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 24,
                  right: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.96)",
                  color: "#0f172a",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {label}
              </div>

              {stockBadge ? (
                <div
                  style={{
                    position: "absolute",
                    left: 24,
                    bottom: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 18px",
                    borderRadius: 999,
                    background:
                      stockBadge.toLowerCase().includes("out") || stockBadge.toLowerCase().includes("sold")
                        ? "rgba(239,68,68,0.94)"
                        : "rgba(5,150,105,0.94)",
                    color: "#ffffff",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {stockBadge}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: 348,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
                color: "#1e293b",
                padding: 36,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 16 }}>GSTECHKH</div>
              <div style={{ fontSize: 30, lineHeight: 1.25, textAlign: "center" }}>{title}</div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              gap: 26,
              padding: "24px 28px 24px",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 620,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  {sellerLogo ? (
                    <img
                      src={sellerLogo}
                      alt={sellerName}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        objectFit: "cover",
                        border: "2px solid rgba(37,99,235,0.14)",
                      }}
                    />
                  ) : siteLogo ? (
                    <img
                      src={siteLogo}
                      alt="GSTECHKH"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #dbeafe, #ede9fe)",
                        color: "#2563eb",
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {sellerName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div
                      style={{
                        display: "flex",
                        color: "#64748b",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Seller
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: "#0f172a",
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {sellerName}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    color: "#0f172a",
                    fontSize: 42,
                    lineHeight: 1.14,
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
                    fontSize: 22,
                    lineHeight: 1.34,
                    maxHeight: 92,
                    overflow: "hidden",
                  }}
                >
                  {subtitle}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 14,
                  marginTop: 20,
                }}
              >
                {price ? (
                  <div
                    style={{
                      display: "flex",
                      color: "#ef4444",
                      fontSize: 38,
                      fontWeight: 900,
                    }}
                  >
                    {price}
                  </div>
                ) : null}
                {comparePrice ? (
                  <div
                    style={{
                      display: "flex",
                      color: "#94a3b8",
                      fontSize: 22,
                      textDecoration: "line-through",
                      marginBottom: 4,
                    }}
                  >
                    {comparePrice}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                width: 250,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 210,
                    height: 210,
                    borderRadius: 28,
                    background: "#f8fafc",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 14,
                    boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{
                      width: 182,
                      height: 182,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  {siteLogo ? (
                    <img
                      src={siteLogo}
                      alt="GSTECHKH"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      color: "#2563eb",
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {domain}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  color: "#3b82f6",
                  fontSize: 14,
                  lineHeight: 1.3,
                  textAlign: "center",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                {truncate(pageUrl, 56)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

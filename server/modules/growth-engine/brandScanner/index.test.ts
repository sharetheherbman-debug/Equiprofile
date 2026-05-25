import { describe, expect, it } from "vitest";
import { scanBrandWebsite, validateBrandScanUrl } from "./index";

describe("brand scanner security", () => {
  it("blocks localhost and private URLs", () => {
    expect(() => validateBrandScanUrl("http://localhost:3000")).toThrow();
    expect(() => validateBrandScanUrl("http://127.0.0.1/test")).toThrow();
    expect(() => validateBrandScanUrl("file:///etc/passwd")).toThrow();
  });

  it("extracts brand DNA fields from safe HTML", async () => {
    const result = await scanBrandWebsite({
      url: "https://example.com",
      fetchHtml: async () => `
        <html>
          <head>
            <title>Equine Growth Studio</title>
            <meta name="description" content="Premium marketing for stable owners" />
          </head>
          <body>
            <a href="https://instagram.com/brand">Instagram</a>
            <a href="https://facebook.com/brand">Facebook</a>
            <img src="/assets/logo-main.png" />
            <p>Book a demo and start your free trial for stable owners.</p>
          </body>
        </html>
      `,
    });

    expect(result.title).toContain("Equine");
    expect(result.ctas.join(" ").toLowerCase()).toContain("book");
    expect(result.socialLinks.length).toBeGreaterThan(0);
    expect(result.logoCandidates.length).toBeGreaterThan(0);
  });

  it("enforces HTML size limit", async () => {
    await expect(
      scanBrandWebsite({
        url: "https://example.com",
        maxHtmlBytes: 30_000,
        fetchHtml: async () => "a".repeat(60_000),
      }),
    ).rejects.toThrow(/size/i);
  });
});

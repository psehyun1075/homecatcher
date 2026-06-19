import { BadRequestException, Injectable } from "@nestjs/common";
import { MetadataSource, MetadataStatus } from "@prisma/client";
import { lookup } from "node:dns/promises";

import { isBlockedHostname, isBlockedIpAddress } from "./utils/ip-address";

const USER_AGENT = "HomeCatcherProductPreview/0.1.0";
const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 512 * 1024;

export interface ProductPreviewResult {
  url: string;
  productName: string | null;
  mallName: string | null;
  productImageUrl: string | null;
  price: number | null;
  currency: string | null;
  metadataStatus: MetadataStatus;
  metadataSource: MetadataSource;
  fetchedAt: Date;
}

interface ParsedMetadata {
  productName?: string;
  mallName?: string;
  productImageUrl?: string;
  price?: number;
  currency?: string;
  source: MetadataSource;
}

@Injectable()
export class ProductPreviewService {
  async preview(url: string): Promise<ProductPreviewResult> {
    const normalizedUrl = this.normalizeUrl(url);
    const fetchedAt = new Date();

    try {
      const html = await this.fetchHtml(normalizedUrl);
      const metadata = this.parseMetadata(html, normalizedUrl);
      const presentCount = [
        metadata.productName,
        metadata.mallName,
        metadata.productImageUrl,
        metadata.price,
        metadata.currency,
      ].filter((value) => value !== undefined && value !== null && value !== "").length;

      return {
        url: normalizedUrl,
        productName: metadata.productName ?? null,
        mallName: metadata.mallName ?? this.hostnameAsMallName(normalizedUrl),
        productImageUrl: metadata.productImageUrl ?? null,
        price: metadata.price ?? null,
        currency: metadata.currency ?? null,
        metadataStatus: presentCount >= 2 ? MetadataStatus.SUCCESS : presentCount >= 1 ? MetadataStatus.PARTIAL : MetadataStatus.FAILED,
        metadataSource: metadata.source,
        fetchedAt,
      };
    } catch (error) {
      if (error instanceof PreviewError) {
        return this.failedPreview(normalizedUrl, error.status, fetchedAt);
      }

      return this.failedPreview(normalizedUrl, MetadataStatus.FAILED, fetchedAt);
    }
  }

  private async fetchHtml(initialUrl: string) {
    let currentUrl = initialUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      await this.assertPublicHttpUrl(currentUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");

          if (!location) {
            throw new PreviewError(MetadataStatus.FAILED);
          }

          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.toLowerCase().includes("text/html") && !contentType.toLowerCase().includes("application/xhtml")) {
          throw new PreviewError(MetadataStatus.UNSUPPORTED);
        }

        if (!response.ok || !response.body) {
          throw new PreviewError(MetadataStatus.FAILED);
        }

        return await this.readLimitedBody(response);
      } catch (error) {
        if (error instanceof PreviewError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new PreviewError(MetadataStatus.TIMEOUT);
        }

        throw new PreviewError(MetadataStatus.FAILED);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new PreviewError(MetadataStatus.UNSUPPORTED);
  }

  private async readLimitedBody(response: Response) {
    const reader = response.body?.getReader();

    if (!reader) {
      throw new PreviewError(MetadataStatus.FAILED);
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        throw new PreviewError(MetadataStatus.UNSUPPORTED);
      }

      chunks.push(value);
    }

    return Buffer.concat(chunks).toString("utf8");
  }

  private normalizeUrl(url: string) {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException("상품 URL을 확인해 주세요.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new BadRequestException("http 또는 https 상품 URL만 사용할 수 있어요.");
    }

    if (parsed.username || parsed.password) {
      throw new BadRequestException("인증 정보가 들어간 URL은 사용할 수 없어요.");
    }

    return parsed.toString();
  }

  private async assertPublicHttpUrl(url: string) {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new PreviewError(MetadataStatus.UNSUPPORTED);
    }

    if (isBlockedHostname(parsed.hostname)) {
      throw new PreviewError(MetadataStatus.UNSUPPORTED);
    }

    const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });

    if (addresses.length === 0 || addresses.some((address) => isBlockedIpAddress(address.address))) {
      throw new PreviewError(MetadataStatus.UNSUPPORTED);
    }
  }

  private parseMetadata(html: string, baseUrl: string): ParsedMetadata {
    const og = {
      title: this.findMetaContent(html, "property", "og:title"),
      image: this.findMetaContent(html, "property", "og:image"),
      siteName: this.findMetaContent(html, "property", "og:site_name"),
    };
    const jsonLd = this.parseJsonLdProduct(html);
    const title = this.findTitle(html);

    const productName = og.title ?? jsonLd.productName ?? title;
    const productImageUrl = this.absoluteUrl(og.image ?? jsonLd.productImageUrl, baseUrl);
    const mallName = og.siteName ?? jsonLd.mallName;
    const price = jsonLd.price;
    const currency = jsonLd.currency;

    if (og.title || og.image || og.siteName) {
      return { productName, productImageUrl, mallName, price, currency, source: MetadataSource.OPEN_GRAPH };
    }

    if (jsonLd.productName || jsonLd.productImageUrl || jsonLd.price !== undefined) {
      return { productName, productImageUrl, mallName, price, currency, source: MetadataSource.JSON_LD };
    }

    if (title) {
      return { productName: title, source: MetadataSource.TITLE };
    }

    return { source: MetadataSource.NONE };
  }

  private parseJsonLdProduct(html: string): Omit<ParsedMetadata, "source"> {
    const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

    for (const script of scripts) {
      const raw = this.decodeHtml(script[1]?.trim() ?? "");

      try {
        const parsed = JSON.parse(raw);
        const product = this.findProductNode(parsed);

        if (product) {
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          const image = Array.isArray(product.image) ? product.image[0] : product.image;
          const brand = typeof product.brand === "object" && product.brand ? product.brand.name : product.brand;

          return {
            productName: this.asText(product.name),
            productImageUrl: this.asText(image),
            mallName: this.asText(brand),
            price: this.asPrice(offer?.price),
            currency: this.asText(offer?.priceCurrency),
          };
        }
      } catch {
        continue;
      }
    }

    return {};
  }

  private findProductNode(value: unknown): Record<string, any> | undefined {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findProductNode(item);

        if (found) {
          return found;
        }
      }
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, any>;
      const type = record["@type"];

      if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
        return record;
      }

      if (Array.isArray(record["@graph"])) {
        return this.findProductNode(record["@graph"]);
      }
    }

    return undefined;
  }

  private findMetaContent(html: string, attribute: "property" | "name", key: string) {
    const metaRegex = /<meta\b[^>]*>/gi;

    for (const match of html.matchAll(metaRegex)) {
      const tag = match[0];
      const attrValue = this.findAttribute(tag, attribute);

      if (attrValue?.toLowerCase() === key.toLowerCase()) {
        return this.findAttribute(tag, "content");
      }
    }

    return undefined;
  }

  private findAttribute(tag: string, attribute: string) {
    const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}\\s*=\\s*(['"])(.*?)\\1`, "i");
    const match = tag.match(regex);
    const value = match?.[2];

    return value ? this.decodeHtml(value.trim()) : undefined;
  }

  private findTitle(html: string) {
    const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = match?.[1]?.replace(/\s+/g, " ").trim();

    return title ? this.decodeHtml(title) : undefined;
  }

  private absoluteUrl(value: string | undefined, baseUrl: string) {
    if (!value) {
      return undefined;
    }

    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  private hostnameAsMallName(url: string) {
    return new URL(url).hostname.replace(/^www\./, "");
  }

  private asText(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  private asPrice(value: unknown) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private decodeHtml(value: string) {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private failedPreview(url: string, status: MetadataStatus, fetchedAt: Date): ProductPreviewResult {
    return {
      url,
      productName: null,
      mallName: null,
      productImageUrl: null,
      price: null,
      currency: null,
      metadataStatus: status,
      metadataSource: MetadataSource.NONE,
      fetchedAt,
    };
  }
}

class PreviewError extends Error {
  constructor(readonly status: MetadataStatus) {
    super(status);
  }
}

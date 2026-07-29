/**
 * Site-wide SEO / social meta defaults for DELACHE.
 * Used by MetaHelmet on every public and gated page.
 */

export const SITE_NAME = "DELACHE";
export const SITE_TAGLINE = "Peritajes eléctricos de precisión";
export const SITE_TWITTER_HANDLE =
  (typeof import.meta.env.VITE_TWITTER_HANDLE === "string" &&
    import.meta.env.VITE_TWITTER_HANDLE.trim()) ||
  "@delache";

/** Brand theme colors for theme-color meta */
export const THEME_COLOR_DARK = "#071426";
export const THEME_COLOR_LIGHT = "#0b4ea2";
export const THEME_COLOR = THEME_COLOR_LIGHT;

export const DEFAULT_LOCALE = "es_MX";
export const DEFAULT_HTML_LANG = "es";

export const DEFAULT_DESCRIPTION =
  "DELACHE transforma los peritajes eléctricos con ingeniería especializada, procesos judiciales estandarizados y tecnología propia. Precisión, trazabilidad y certeza para cada expediente.";

export const DEFAULT_KEYWORDS = [
  "DELACHE",
  "peritajes eléctricos",
  "dictámenes técnicos",
  "inspecciones técnicas",
  "ratificaciones",
  "asesoría técnica",
  "ingeniería forense",
  "evidencia eléctrica",
  "México",
];

/** Preferred 1200×630 share image — override via VITE_DEFAULT_OG_IMAGE */
export const DEFAULT_OG_IMAGE =
  (typeof import.meta.env.VITE_DEFAULT_OG_IMAGE === "string" &&
    import.meta.env.VITE_DEFAULT_OG_IMAGE.trim()) ||
  "/og-image.svg";

export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_ALT =
  "DELACHE — Peritajes eléctricos de precisión";

export interface MetaSocialImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

export type MetaSocialImageInput = string | MetaSocialImage;

export interface ResolvedMetaImage extends MetaSocialImage {
  url: string;
  alt: string;
  secureUrl: string;
}

/** Resolve public site origin for canonical / OG URLs */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:8080";
}

/** Build absolute URL from path or pass-through if already absolute */
export function resolveAbsoluteUrl(
  pathOrUrl: string,
  origin = getSiteOrigin(),
): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${path}`;
}

export function inferImageMimeType(url: string): string | undefined {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    default:
      return undefined;
  }
}

function toHttpsUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

function normalizeImageInput(
  input: MetaSocialImageInput,
  defaultAlt: string,
  origin: string,
  defaults?: { width?: number; height?: number; type?: string },
): ResolvedMetaImage {
  const raw =
    typeof input === "string"
      ? { url: input, alt: defaultAlt }
      : { alt: defaultAlt, ...input };

  const url = resolveAbsoluteUrl(raw.url, origin);
  const width = raw.width ?? defaults?.width;
  const height = raw.height ?? defaults?.height;
  const type = raw.type ?? inferImageMimeType(url) ?? defaults?.type;

  return {
    url,
    secureUrl: toHttpsUrl(url),
    alt: raw.alt?.trim() || defaultAlt,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(type ? { type } : {}),
  };
}

/** One or more share images; always returns at least the default OG asset */
export function resolveMetaImages(options: {
  image?: string | null;
  images?: MetaSocialImageInput[];
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  defaultAlt: string;
  origin?: string;
}): ResolvedMetaImage[] {
  const origin = options.origin ?? getSiteOrigin();
  const defaults = {
    width: options.imageWidth ?? DEFAULT_OG_IMAGE_WIDTH,
    height: options.imageHeight ?? DEFAULT_OG_IMAGE_HEIGHT,
    type: options.imageType,
  };

  const inputs: MetaSocialImageInput[] = [];
  if (options.images?.length) {
    inputs.push(...options.images);
  } else if (options.image?.trim()) {
    inputs.push({
      url: options.image,
      alt: options.defaultAlt,
      width: options.imageWidth,
      height: options.imageHeight,
      type: options.imageType,
    });
  }

  if (inputs.length === 0) {
    return [
      normalizeImageInput(
        {
          url: DEFAULT_OG_IMAGE,
          alt: DEFAULT_OG_IMAGE_ALT,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
        },
        options.defaultAlt,
        origin,
      ),
    ];
  }

  return inputs.map((item, index) =>
    normalizeImageInput(
      item,
      options.defaultAlt,
      origin,
      index === 0 ? defaults : undefined,
    ),
  );
}

export function formatDocumentTitle(
  title: string,
  options?: { siteName?: string; withSiteSuffix?: boolean },
): string {
  const siteName = options?.siteName ?? SITE_NAME;
  const withSiteSuffix = options?.withSiteSuffix ?? true;
  if (!withSiteSuffix) return title.trim();
  const normalized = title.trim();
  if (normalized.toLowerCase().includes(siteName.toLowerCase())) {
    return normalized;
  }
  return `${normalized} · ${siteName}`;
}

export function truncateMetaText(text: string, maxLength = 160): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeKeywords(
  keywords?: string | string[],
): string | undefined {
  if (!keywords) return undefined;
  const list = (Array.isArray(keywords) ? keywords : keywords.split(","))
    .map((k) => k.trim())
    .filter(Boolean);
  return list.length > 0 ? list.join(", ") : undefined;
}

/** Private / auth areas should not be indexed */
export function isPrivateRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app")
  );
}

/** Default Organization JSON-LD for brand pages */
export function buildOrganizationJsonLd(origin = getSiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    logo: resolveAbsoluteUrl(DEFAULT_OG_IMAGE, origin),
    email: "contacto@delache.com.mx",
    areaServed: {
      "@type": "Country",
      name: "México",
    },
    knowsAbout: [
      "Peritajes eléctricos",
      "Dictámenes técnicos",
      "Inspecciones técnicas",
      "Ingeniería forense",
    ],
  };
}

/** WebSite JSON-LD */
export function buildWebSiteJsonLd(origin = getSiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    inLanguage: DEFAULT_HTML_LANG,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

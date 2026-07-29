import { type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_HTML_LANG,
  DEFAULT_KEYWORDS,
  DEFAULT_LOCALE,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_NAME,
  SITE_TWITTER_HANDLE,
  THEME_COLOR,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  formatDocumentTitle,
  getSiteOrigin,
  isPrivateRoute,
  normalizeKeywords,
  resolveAbsoluteUrl,
  resolveMetaImages,
  truncateMetaText,
  type MetaSocialImageInput,
  type ResolvedMetaImage,
} from "@/lib/siteMeta";

export interface MetaHelmetProps {
  /** Document & social title (site suffix applied by default) */
  title: string;
  withSiteSuffix?: boolean;
  /** Override Open Graph / Twitter title (defaults to document title) */
  ogTitle?: string;
  description?: string;
  ogDescription?: string;
  keywords?: string | string[];
  /** Primary share image — absolute or site-relative URL */
  image?: string | null;
  /** Additional images (e.g. gallery); first entry is primary for Twitter */
  images?: MetaSocialImageInput[];
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  /** Path or absolute URL; defaults to current route */
  path?: string;
  canonical?: string;
  ogType?: "website" | "article" | "profile";
  robots?: string;
  noindex?: boolean;
  locale?: string;
  htmlLang?: string;
  publishedTime?: string;
  modifiedTime?: string;
  articleAuthor?: string;
  articleSection?: string;
  articleTags?: string[];
  twitterCard?: "summary" | "summary_large_image";
  twitterHandle?: string;
  themeColor?: string;
  colorScheme?: "light" | "dark" | "light dark";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  children?: ReactNode;
}

/** Helmet only accepts native head tags — never wrap meta/link in function components */
function openGraphImageElements(images: ResolvedMetaImage[]): ReactNode[] {
  return images.flatMap((img) => {
    const tags: ReactNode[] = [
      <meta key={`${img.url}-og`} property="og:image" content={img.url} />,
      <meta
        key={`${img.url}-secure`}
        property="og:image:secure_url"
        content={img.secureUrl}
      />,
      <meta key={`${img.url}-alt`} property="og:image:alt" content={img.alt} />,
    ];
    if (img.width != null) {
      tags.push(
        <meta
          key={`${img.url}-w`}
          property="og:image:width"
          content={String(img.width)}
        />,
      );
    }
    if (img.height != null) {
      tags.push(
        <meta
          key={`${img.url}-h`}
          property="og:image:height"
          content={String(img.height)}
        />,
      );
    }
    if (img.type) {
      tags.push(
        <meta
          key={`${img.url}-type`}
          property="og:image:type"
          content={img.type}
        />,
      );
    }
    return tags;
  });
}

function jsonLdScriptElements(
  jsonLd: Record<string, unknown> | Record<string, unknown>[],
): ReactNode[] {
  const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return items.map((item, index) => (
    <script
      key={`jsonld-${index}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
    />
  ));
}

/**
 * Strong, reusable document head for every DELACHE page.
 * Covers title, description, robots, canonical, Open Graph, Twitter,
 * theme-color, and optional JSON-LD.
 */
export default function MetaHelmet({
  title,
  withSiteSuffix = true,
  ogTitle,
  description,
  ogDescription,
  keywords,
  image,
  images,
  imageAlt,
  imageWidth,
  imageHeight,
  imageType,
  path,
  canonical,
  ogType = "website",
  robots,
  noindex = false,
  locale = DEFAULT_LOCALE,
  htmlLang = DEFAULT_HTML_LANG,
  publishedTime,
  modifiedTime,
  articleAuthor,
  articleSection,
  articleTags,
  twitterCard,
  twitterHandle = SITE_TWITTER_HANDLE,
  themeColor = THEME_COLOR,
  colorScheme = "light dark",
  jsonLd,
  children,
}: MetaHelmetProps) {
  const { pathname, search } = useLocation();

  const origin = getSiteOrigin();
  const routePath = path ?? `${pathname}${search}`;
  const pageUrl = resolveAbsoluteUrl(routePath, origin);
  const canonicalUrl = canonical
    ? resolveAbsoluteUrl(canonical, origin)
    : pageUrl;

  const pageTitle = formatDocumentTitle(title, { withSiteSuffix });
  const socialTitle = ogTitle?.trim() || pageTitle;
  const pageDescription = truncateMetaText(
    description?.trim() || DEFAULT_DESCRIPTION,
  );
  const socialDescription = truncateMetaText(
    ogDescription?.trim() || description?.trim() || DEFAULT_DESCRIPTION,
  );
  const pageKeywords =
    normalizeKeywords(keywords) ?? DEFAULT_KEYWORDS.join(", ");
  const shouldNoindex = noindex || isPrivateRoute(pathname);
  const robotsContent =
    robots ?? (shouldNoindex ? "noindex, nofollow" : "index, follow");

  const shareImages = resolveMetaImages({
    image,
    images,
    imageWidth,
    imageHeight,
    imageType,
    defaultAlt: imageAlt?.trim() || socialTitle,
    origin,
  });
  const primaryImage = shareImages[0];

  const card: "summary" | "summary_large_image" =
    twitterCard ?? "summary_large_image";

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang: htmlLang }}>
      <title>{pageTitle}</title>

      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />
      <meta name="author" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="theme-color" content={themeColor} />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content={THEME_COLOR_LIGHT}
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content={THEME_COLOR_DARK}
      />
      <meta name="msapplication-TileColor" content={THEME_COLOR_LIGHT} />
      <meta name="color-scheme" content={colorScheme} />
      <meta name="format-detection" content="telephone=no" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />

      <meta itemProp="name" content={socialTitle} />
      <meta itemProp="description" content={socialDescription} />
      {primaryImage ? (
        <meta itemProp="image" content={primaryImage.secureUrl} />
      ) : null}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={socialTitle} />
      <meta property="og:description" content={socialDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content="en_US" />

      {openGraphImageElements(shareImages)}

      {ogType === "article" && publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {ogType === "article" && modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}
      {ogType === "article" && articleAuthor ? (
        <meta property="article:author" content={articleAuthor} />
      ) : null}
      {ogType === "article" && articleSection ? (
        <meta property="article:section" content={articleSection} />
      ) : null}
      {ogType === "article"
        ? articleTags?.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))
        : null}

      <meta name="twitter:card" content={card} />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={socialDescription} />
      {primaryImage ? (
        <meta name="twitter:image" content={primaryImage.secureUrl} />
      ) : null}
      {primaryImage ? (
        <meta name="twitter:image:src" content={primaryImage.secureUrl} />
      ) : null}
      {primaryImage ? (
        <meta name="twitter:image:alt" content={primaryImage.alt} />
      ) : null}

      {jsonLd ? jsonLdScriptElements(jsonLd) : null}
      {children}
    </Helmet>
  );
}

export {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_NAME,
};

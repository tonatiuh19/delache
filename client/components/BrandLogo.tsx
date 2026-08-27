import { cn } from "@/lib/utils";

/** Full lockup: lion + DELACHE + tagline */
export const BRAND_LOGO_FULL = "/brand/logo-full.png";
/** Mark only: lion + bolt */
export const BRAND_LOGO_MARK = "/brand/logo.png";

type BrandLogoProps = {
  /** `full` = logo-full.png; `mark` = logo.png */
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imgClassName?: string;
  alt?: string;
};

const HEIGHT = {
  sm: "h-9",
  md: "h-11",
  lg: "h-14",
  xl: "h-24",
} as const;

/**
 * Official brand assets only:
 * - `/brand/logo-full.png`
 * - `/brand/logo.png`
 */
export default function BrandLogo({
  variant = "full",
  size = "md",
  className,
  imgClassName,
  alt = "DELACHE",
}: BrandLogoProps) {
  return (
    <img
      src={variant === "mark" ? BRAND_LOGO_MARK : BRAND_LOGO_FULL}
      alt={alt}
      className={cn(
        HEIGHT[size],
        "w-auto bg-transparent object-contain object-left",
        className,
        imgClassName,
      )}
    />
  );
}

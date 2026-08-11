import { ExternalLink, Eye, MapPin, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  googleStreetViewUrl,
  osmEmbedUrl,
} from "@shared/locationRules";

type Props = {
  lat?: number | null;
  lng?: number | null;
  label?: string | null;
  /** City / address query when no coordinates */
  query?: string | null;
  className?: string;
  compact?: boolean;
  showStreetView?: boolean;
};

/** Map preview + GPS navigation links for inspections, evidence pins, and trips. */
export default function LocationMapPanel({
  lat,
  lng,
  label,
  query,
  className,
  compact,
  showStreetView = true,
}: Props) {
  const { t } = useTranslation();
  const embed = osmEmbedUrl({ lat, lng });
  const search = googleMapsSearchUrl({ lat, lng, query });
  const directions = googleMapsDirectionsUrl({ lat, lng, query });
  const streetView =
    showStreetView && lat != null && lng != null
      ? googleStreetViewUrl({ lat, lng })
      : null;
  const hasCoords = lat != null && lng != null;
  const hasQuery = Boolean(query?.trim());

  if (!hasCoords && !hasQuery) return null;

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-border bg-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {label || t("maps.location")}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {hasCoords ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : query}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-accent-foreground"
            >
              <Navigation className="h-3 w-3" />
              {t("maps.navigate")}
            </a>
          ) : null}
          {streetView ? (
            <a
              href={streetView}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-primary"
            >
              <Eye className="h-3 w-3" />
              {t("maps.streetView")}
            </a>
          ) : null}
          {search ? (
            <a
              href={search}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              {t("maps.openMap")}
            </a>
          ) : null}
        </div>
      </div>
      {embed && !compact ? (
        <iframe
          title={label || t("maps.location")}
          src={embed}
          className="h-48 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : null}
    </div>
  );
}

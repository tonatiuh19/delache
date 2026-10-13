import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Crosshair, MapPinned, Pencil } from "lucide-react";
import LocationMapPanel from "@/components/portal/LocationMapPanel";
import LocationPermissionModal from "@/components/portal/LocationPermissionModal";
import {
  caseDetailFieldClass,
  caseDetailFormGrid3Class,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toast } from "@/hooks/use-toast";
import { requestDevicePosition, queryLocationPermission } from "@/utils/geolocation";
import {
  resolveFocusedSection,
  shouldShowSection,
} from "@shared/caseStepTreeRules";
import {
  buildPropertyQuery,
  formatDecimalCoordinate,
  hasPropertyMapPreview,
  resolveOptionalLatLng,
  shouldStartPropertyLocationEditing,
} from "@shared/locationRules";
import { resolveLocationGpsForSave } from "@shared/formSaveRules";
import {
  LOCATION_PROMPT_DISMISS_KEY,
  locationCaptureStrategy,
  shouldSkipModalAndCapture,
} from "@shared/locationPermissionRules";
import { canEditCaseLocation } from "@shared/portalCapabilities";
import {
  fetchCaseDetail,
  geocodeAddress,
  updateCaseLocation,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseLocationSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { stepSlug } = useParams<{ stepSlug?: string }>();
  const [searchParams] = useSearchParams();
  const focusedSection = resolveFocusedSection(
    stepSlug,
    searchParams.get("section"),
  );
  const dispatch = useAppDispatch();
  const { selected } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [locating, setLocating] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const locationAutoTriedRef = useRef(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationEditing, setLocationEditing] = useState(true);

  useEffect(() => {
    locationAutoTriedRef.current = false;
  }, [publicUuid]);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  useEffect(() => {
    if (!selected) return;
    setLocationEditing(
      shouldStartPropertyLocationEditing({
        address: selected.propertyAddress,
        city: selected.propertyCity,
        state: selected.propertyState,
        postalCode: selected.propertyPostalCode,
        country: selected.propertyCountry,
        lat: selected.propertyLat,
        lng: selected.propertyLng,
      }),
    );
  }, [selected?.publicUuid]);

  const locationForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      propertyAddress: selected?.propertyAddress || "",
      propertyCity: selected?.propertyCity || "",
      propertyState: selected?.propertyState || "",
      propertyPostalCode: selected?.propertyPostalCode || "",
      propertyCountry: selected?.propertyCountry || "MX",
      propertyLat:
        selected?.propertyLat != null
          ? formatDecimalCoordinate(selected.propertyLat)
          : "",
      propertyLng:
        selected?.propertyLng != null
          ? formatDecimalCoordinate(selected.propertyLng)
          : "",
    },
    onSubmit: async (values) => {
      setLocationStatus(null);
      const gps = resolveLocationGpsForSave({
        latRaw: values.propertyLat,
        lngRaw: values.propertyLng,
        resolveOptionalLatLng,
      });
      let propertyLat: number | null = selected?.propertyLat ?? null;
      let propertyLng: number | null = selected?.propertyLng ?? null;
      if (gps.action === "clear") {
        propertyLat = null;
        propertyLng = null;
      } else if (gps.action === "set") {
        propertyLat = gps.lat;
        propertyLng = gps.lng;
        await locationForm.setFieldValue(
          "propertyLat",
          formatDecimalCoordinate(gps.lat),
        );
        await locationForm.setFieldValue(
          "propertyLng",
          formatDecimalCoordinate(gps.lng),
        );
      } else if (gps.warning === "need_both") {
        toast({
          title: t("maps.locationPartialSaved"),
          description: t("maps.gpsNeedBoth"),
          variant: "destructive",
        });
      } else if (gps.warning === "invalid") {
        toast({
          title: t("maps.locationPartialSaved"),
          description: t("maps.invalidGpsText"),
          variant: "destructive",
        });
      }
      const result = await dispatch(
        updateCaseLocation({
          publicUuid,
          propertyAddress: values.propertyAddress.trim() || null,
          propertyCity: values.propertyCity.trim() || null,
          propertyState: values.propertyState.trim() || null,
          propertyPostalCode: values.propertyPostalCode.trim() || null,
          propertyCountry: values.propertyCountry.trim() || "MX",
          propertyLat,
          propertyLng,
        }),
      );
      if (updateCaseLocation.fulfilled.match(result)) {
        setLocationStatus(t("maps.locationSaved"));
        setLocationEditing(false);
        toast({
          title: t("maps.locationSaved"),
        });
        refreshDetail();
      } else {
        const message = String(result.payload || t("maps.locationSaveFailed"));
        setLocationStatus(t("maps.locationSaveFailed"));
        toast({
          title: t("maps.locationSaveFailed"),
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const persistPropertyCoords = async (lat: number, lng: number) => {
    const next = {
      ...locationForm.values,
      propertyLat: String(lat),
      propertyLng: String(lng),
    };
    await locationForm.setValues(next);
    setLocationStatus(null);
    const result = await dispatch(
      updateCaseLocation({
        publicUuid,
        propertyAddress: next.propertyAddress.trim() || null,
        propertyCity: next.propertyCity.trim() || null,
        propertyState: next.propertyState.trim() || null,
        propertyPostalCode: next.propertyPostalCode.trim() || null,
        propertyCountry: next.propertyCountry.trim() || "MX",
        propertyLat: lat,
        propertyLng: lng,
      }),
    );
    if (updateCaseLocation.fulfilled.match(result)) {
      setLocationStatus(t("maps.locationSaved"));
      setLocationEditing(false);
      refreshDetail();
    } else {
      setLocationStatus(t("maps.locationSaveFailed"));
    }
  };

  const cancelLocationEdit = () => {
    locationForm.resetForm();
    setLocationStatus(null);
    if (
      selected &&
      hasPropertyMapPreview({
        address: selected.propertyAddress,
        city: selected.propertyCity,
        state: selected.propertyState,
        postalCode: selected.propertyPostalCode,
        country: selected.propertyCountry,
        lat: selected.propertyLat,
        lng: selected.propertyLng,
      })
    ) {
      setLocationEditing(false);
    }
  };

  const applyDevicePosition = async () => {
    setLocating(true);
    setLocationStatus(null);
    const pos = await requestDevicePosition();
    setLocating(false);
    if (pos.ok === false) {
      setLocationStatus(
        pos.code === "permission_denied"
          ? t("maps.permissionDenied")
          : pos.code === "unsupported"
            ? t("maps.unsupported")
            : t("maps.locationFailed"),
      );
      return;
    }
    await persistPropertyCoords(pos.lat, pos.lng);
  };

  const openLocationPromptOrCapture = async () => {
    const permission = await queryLocationPermission();
    if (shouldSkipModalAndCapture(permission)) {
      await applyDevicePosition();
      return;
    }
    if (permission === "denied") {
      setLocationStatus(t("maps.permissionDenied"));
      return;
    }
    setLocationPromptOpen(true);
  };

  const fillFromDevice = async () => {
    await openLocationPromptOrCapture();
  };

  const dismissLocationPrompt = () => {
    setLocationPromptOpen(false);
    try {
      sessionStorage.setItem(LOCATION_PROMPT_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const allowLocationFromModal = async () => {
    await applyDevicePosition();
    setLocationPromptOpen(false);
  };

  const geocodeProperty = async () => {
    const query =
      buildPropertyQuery({
        address: locationForm.values.propertyAddress,
        city: locationForm.values.propertyCity,
        state: locationForm.values.propertyState,
        postalCode: locationForm.values.propertyPostalCode,
        country: locationForm.values.propertyCountry,
      }) || locationForm.values.propertyAddress;
    if (!query || query.trim().length < 3) {
      setLocationStatus(t("maps.geocodeNeedAddress"));
      return;
    }
    setLocating(true);
    setLocationStatus(null);
    const result = await dispatch(geocodeAddress(query.trim()));
    setLocating(false);
    if (geocodeAddress.fulfilled.match(result)) {
      await persistPropertyCoords(result.payload.lat, result.payload.lng);
    } else {
      setLocationStatus(t("maps.geocodeFailed"));
    }
  };

  useEffect(() => {
    if (!selected || selected.publicUuid !== publicUuid) return;
    if (!canEditCaseLocation(role)) return;
    if (!shouldShowSection("location", stepSlug, false, focusedSection)) {
      return;
    }
    if (locationAutoTriedRef.current) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        locationAutoTriedRef.current = true;
        const hasCoords =
          selected.propertyLat != null && selected.propertyLng != null;
        let dismissed = false;
        try {
          dismissed =
            sessionStorage.getItem(LOCATION_PROMPT_DISMISS_KEY) === "1";
        } catch {
          dismissed = false;
        }
        const permission = await queryLocationPermission();
        if (cancelled) return;
        const strategy = locationCaptureStrategy({
          permission,
          hasCoords,
          canEdit: true,
          dismissedPrompt: dismissed,
        });
        if (strategy === "auto_capture") {
          await applyDevicePosition();
          return;
        }
        if (strategy === "show_modal") {
          setLocationPromptOpen(true);
          return;
        }
        if (strategy === "blocked" && !hasCoords) {
          setLocationStatus(t("maps.permissionDenied"));
        }
      })();
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Intentionally once per case visit when location section is in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto GPS prompt
  }, [
    selected?.publicUuid,
    selected?.propertyLat,
    selected?.propertyLng,
    publicUuid,
    role,
    stepSlug,
    focusedSection,
  ]);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const propertyMapDraft = resolveOptionalLatLng(
    locationForm.values.propertyLat,
    locationForm.values.propertyLng,
  );
  const propertyMapLat =
    propertyMapDraft.ok && propertyMapDraft.value
      ? propertyMapDraft.value.lat
      : selected.propertyLat;
  const propertyMapLng =
    propertyMapDraft.ok && propertyMapDraft.value
      ? propertyMapDraft.value.lng
      : selected.propertyLng;

  return (
    <>
      {locationStatus ? (
        <p className="text-xs text-muted-foreground">{locationStatus}</p>
      ) : null}
      <CaseDetailSectionPanel
        id="case-location"
        sectionId="location"
        title={t("maps.propertyLocation")}
        icon={<MapPinned size={18} />}
        className="overflow-x-clip"
        headerAside={
          canEditCaseLocation(role) ? (
            locationEditing ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={locating}
                  onClick={() => void fillFromDevice()}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {t("maps.useMyLocation")}
                </button>
                <button
                  type="button"
                  disabled={locating}
                  onClick={() => void geocodeProperty()}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
                >
                  {t("maps.geocodeAddress")}
                </button>
                {hasPropertyMapPreview({
                  address: selected.propertyAddress,
                  city: selected.propertyCity,
                  state: selected.propertyState,
                  postalCode: selected.propertyPostalCode,
                  country: selected.propertyCountry,
                  lat: selected.propertyLat,
                  lng: selected.propertyLng,
                }) ? (
                  <button
                    type="button"
                    onClick={cancelLocationEdit}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  >
                    {t("maps.cancelEditLocation")}
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLocationStatus(null);
                  setLocationEditing(true);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("maps.editLocation")}
              </button>
            )
          ) : null
        }
      >
          {!locationEditing ||
          propertyMapLat != null ||
          Boolean(
            buildPropertyQuery({
              address: locationEditing
                ? locationForm.values.propertyAddress
                : selected.propertyAddress,
              city: locationEditing
                ? locationForm.values.propertyCity
                : selected.propertyCity,
              state: locationEditing
                ? locationForm.values.propertyState
                : selected.propertyState,
              postalCode: locationEditing
                ? locationForm.values.propertyPostalCode
                : selected.propertyPostalCode,
              country: locationEditing
                ? locationForm.values.propertyCountry
                : selected.propertyCountry,
            }),
          ) ? (
            <LocationMapPanel
              className="mt-4"
              mapSize="large"
              lat={locationEditing ? propertyMapLat : selected.propertyLat}
              lng={locationEditing ? propertyMapLng : selected.propertyLng}
              query={buildPropertyQuery({
                address: locationEditing
                  ? locationForm.values.propertyAddress
                  : selected.propertyAddress,
                city: locationEditing
                  ? locationForm.values.propertyCity
                  : selected.propertyCity,
                state: locationEditing
                  ? locationForm.values.propertyState
                  : selected.propertyState,
                postalCode: locationEditing
                  ? locationForm.values.propertyPostalCode
                  : selected.propertyPostalCode,
                country: locationEditing
                  ? locationForm.values.propertyCountry
                  : selected.propertyCountry,
              })}
              label={t("maps.propertyLocation")}
            />
          ) : null}

          {canEditCaseLocation(role) && locationEditing ? (
            <form
              onSubmit={locationForm.handleSubmit}
              className={cn("mt-3", caseDetailFormGrid3Class)}
            >
              <div className="sm:col-span-2 lg:col-span-3">
                <input
                  name="propertyAddress"
                  value={locationForm.values.propertyAddress}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.address")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyCity"
                  value={locationForm.values.propertyCity}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.city")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyState"
                  value={locationForm.values.propertyState}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.state")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyPostalCode"
                  value={locationForm.values.propertyPostalCode}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.postalCode")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyCountry"
                  value={locationForm.values.propertyCountry}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.country")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyLat"
                  value={locationForm.values.propertyLat}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.lat")}
                  className={caseDetailFieldClass}
                />
              </div>
              <div>
                <input
                  name="propertyLng"
                  value={locationForm.values.propertyLng}
                  onChange={locationForm.handleChange}
                  placeholder={t("maps.lng")}
                  className={caseDetailFieldClass}
                />
              </div>
              <PendingSubmitButton
                pending={locationForm.isSubmitting}
                className="h-11 sm:col-span-2 lg:col-span-3 text-xs font-bold"
              >
                {t("maps.saveLocation")}
              </PendingSubmitButton>
            </form>
          ) : null}

          {!locationEditing &&
          canEditCaseLocation(role) &&
          !hasPropertyMapPreview({
            address: selected.propertyAddress,
            city: selected.propertyCity,
            state: selected.propertyState,
            postalCode: selected.propertyPostalCode,
            country: selected.propertyCountry,
            lat: selected.propertyLat,
            lng: selected.propertyLng,
          }) ? (
            <button
              type="button"
              onClick={() => setLocationEditing(true)}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/30 text-xs font-semibold text-foreground"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" />
              {t("maps.addLocation")}
            </button>
          ) : null}
      </CaseDetailSectionPanel>

      <LocationPermissionModal
        open={locationPromptOpen}
        target="property"
        locating={locating}
        onOpenChange={(open) => {
          if (!open) dismissLocationPrompt();
          else setLocationPromptOpen(true);
        }}
        onAllow={() => void allowLocationFromModal()}
        onNotNow={dismissLocationPrompt}
      />
    </>
  );
}

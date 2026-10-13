import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import { CaseDetailSkeleton } from "@/components/portal/PortalSkeletons";
import CaseDetailShell from "@/components/portal/case-detail/CaseDetailShell";
import DespachoCaseDetailPage from "@/pages/portal/DespachoCaseDetail";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCaseDetail } from "@/store/slices/casesSlice";
import { fetchTeamMembers } from "@/store/slices/portalSlice";
import {
  caseStepPath,
  canonicalizeStepSlug,
  defaultSubsectionForStep,
  isValidProcessStepSlug,
  legacySectionForHash,
  redirectStepForLegacyHash,
  resolveFocusedSection,
  type ProcessStepSlug,
} from "@shared/caseStepTreeRules";
import { lawFirmCaseDetailTarget } from "@shared/portalSessionRules";

export default function CaseDetailLayout() {
  const actor = useAppSelector((s) => s.auth.user?.actor);
  const { publicUuid = "", stepSlug } = useParams<{
    publicUuid: string;
    stepSlug?: string;
  }>();

  const despacho = lawFirmCaseDetailTarget({
    actor,
    publicUuid,
    stepSlug,
  });
  if (despacho.mode === "despacho") {
    if (despacho.redirectTo) {
      return <Navigate to={despacho.redirectTo} replace />;
    }
    return <DespachoCaseDetailPage />;
  }

  return <StaffCaseDetailLayout />;
}

function StaffCaseDetailLayout() {
  const { publicUuid = "", stepSlug } = useParams<{
    publicUuid: string;
    stepSlug?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, detailLoading, error } = useAppSelector((s) => s.cases);

  useEffect(() => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
    void dispatch(
      fetchTeamMembers({ limit: 100, sortBy: "first_name", sortDir: "ASC" }),
    );
  }, [dispatch, publicUuid]);

  useEffect(() => {
    const legacy = redirectStepForLegacyHash(location.hash);
    if (!legacy || !publicUuid) return;
    const legacySection = legacySectionForHash(location.hash);
    navigate(
      caseStepPath(
        publicUuid,
        legacy,
        legacySection ?? defaultSubsectionForStep(legacy) ?? undefined,
      ),
      { replace: true },
    );
  }, [location.hash, navigate, publicUuid]);

  useEffect(() => {
    if (!stepSlug || !publicUuid || !isValidProcessStepSlug(stepSlug)) return;
    const canonical = canonicalizeStepSlug(stepSlug);
    if (canonical && canonical !== stepSlug) {
      navigate(
        caseStepPath(
          publicUuid,
          canonical,
          sectionParam && isValidProcessStepSlug(stepSlug)
            ? (resolveFocusedSection(canonical, sectionParam) ??
              defaultSubsectionForStep(canonical) ??
              undefined)
            : defaultSubsectionForStep(canonical) ?? undefined,
        ),
        { replace: true },
      );
      return;
    }
    const focused = resolveFocusedSection(stepSlug, sectionParam);
    if (focused) return;
    const defaultSection = defaultSubsectionForStep(stepSlug);
    if (!defaultSection) return;
    navigate(
      caseStepPath(publicUuid, stepSlug as ProcessStepSlug, defaultSection),
      { replace: true },
    );
  }, [navigate, publicUuid, sectionParam, stepSlug]);

  if (!publicUuid) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {t("cases.notFound")}
      </div>
    );
  }

  if (stepSlug && !isValidProcessStepSlug(stepSlug)) {
    return <Navigate to={caseStepPath(publicUuid)} replace />;
  }

  const detailMatchesRoute =
    Boolean(selected) && selected!.publicUuid === publicUuid;

  const showDetailSkeleton = !detailMatchesRoute && detailLoading;

  if (showDetailSkeleton) {
    return <CaseDetailSkeleton />;
  }

  if (!selected || !detailMatchesRoute) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-8">
        <p className="text-sm text-muted-foreground">
          {error ? t("cases.loadFailed") : t("cases.notFound")}
        </p>
        <button
          type="button"
          onClick={() => void dispatch(fetchCaseDetail(publicUuid))}
          className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      <MetaHelmet title={selected.caseNumber} noindex />
      <CaseDetailShell selected={selected}>
        <Outlet />
      </CaseDetailShell>
    </>
  );
}

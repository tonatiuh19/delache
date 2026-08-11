import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import MetaHelmet from "@/components/MetaHelmet";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import {
  CalendarPageSkeleton,
} from "@/components/portal/PortalSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createCalendarEvent,
  fetchCalendarEvents,
} from "@/store/slices/portalSlice";
import { fetchCases } from "@/store/slices/casesSlice";
import {
  addMonths,
  asEventType,
  CALENDAR_EVENT_TYPES,
  defaultStartForDay,
  EVENT_TYPE_CHIP,
  formatDayHeading,
  formatEventTime,
  formatMonthTitle,
  groupEventsByDay,
  isSameMonth,
  monthRangeIso,
  startOfMonth,
  toDateKey,
} from "@/lib/calendarUtils";

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { events, loadingEvents, error } = useAppSelector((s) => s.portal);
  const { items: cases } = useAppSelector((s) => s.cases);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void dispatch(fetchCases({ limit: 100, sortBy: "title", sortDir: "ASC" }));
  }, [dispatch]);

  useEffect(() => {
    const { from, to } = monthRangeIso(month);
    void dispatch(fetchCalendarEvents({ from, to }));
  }, [dispatch, month]);

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const selectedEvents = eventsByDay.get(toDateKey(selected)) || [];
  const locale = i18n.language?.startsWith("en") ? "en" : "es";

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      title: "",
      eventType: "meeting",
      startsAt: defaultStartForDay(selected),
      location: "",
      caseId: "",
    },
    validationSchema: Yup.object({
      title: Yup.string().trim().required(),
      startsAt: Yup.string().required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createCalendarEvent({
          title: values.title.trim(),
          eventType: values.eventType as
            | "court_date"
            | "inspection"
            | "travel"
            | "deadline"
            | "meeting"
            | "ratification"
            | "other",
          startsAt: new Date(values.startsAt).toISOString(),
          location: values.location.trim() || undefined,
          caseId: values.caseId ? Number(values.caseId) : null,
        }),
      );
      if (createCalendarEvent.fulfilled.match(result)) {
        helpers.resetForm({
          values: {
            title: "",
            eventType: "meeting",
            startsAt: defaultStartForDay(selected),
            location: "",
            caseId: "",
          },
        });
        setShowForm(false);
        const { from, to } = monthRangeIso(month);
        void dispatch(fetchCalendarEvents({ from, to }));
      }
    },
  });

  if (loadingEvents && events.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <MetaHelmet title={t("portal.calendar")} noindex />
        <CalendarPageSkeleton />
      </div>
    );
  }

  const goToday = () => {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelected(now);
  };

  const selectDay = (day: Date) => {
    setSelected(day);
    if (!isSameMonth(day, month)) {
      setMonth(startOfMonth(day));
    }
    setShowForm(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <MetaHelmet title={t("portal.calendar")} noindex />

      <PortalPageHeader
        eyebrow={t("calendar.eyebrow")}
        title={t("portal.calendar")}
        description={t("calendar.subtitle")}
        actions={
          <>
            <button
              type="button"
              onClick={goToday}
              className="h-10 shrink-0 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              {t("calendar.today")}
            </button>
            <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-border bg-card">
              <button
                type="button"
                aria-label={t("calendar.prevMonth")}
                onClick={() => setMonth((m) => addMonths(m, -1))}
                className="grid h-10 w-10 place-items-center text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-[9.5rem] px-2 text-center text-sm font-semibold capitalize">
                {formatMonthTitle(month, locale)}
              </div>
              <button
                type="button"
                aria-label={t("calendar.nextMonth")}
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="grid h-10 w-10 place-items-center text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                void form.setFieldValue("startsAt", defaultStartForDay(selected));
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
            >
              <Plus size={15} />
              {t("calendar.addEvent")}
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {CALENDAR_EVENT_TYPES.map((type) => (
          <span
            key={type}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${EVENT_TYPE_CHIP[type]}`}
          >
            {t(`calendar.type.${type}`)}
          </span>
        ))}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <MonthCalendar
          month={month}
          selected={selected}
          today={today}
          eventsByDay={eventsByDay}
          locale={locale}
          loading={loadingEvents}
          onSelectDay={selectDay}
          typeLabel={(type) =>
            t(`calendar.type.${type}`, { defaultValue: type })
          }
          moreLabel={(count) => t("calendar.more", { count })}
        />

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                <CalendarDays size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  {t("calendar.selectedDay")}
                </p>
                <h2 className="mt-1 font-[Manrope] text-lg font-semibold capitalize leading-snug">
                  {formatDayHeading(selected, locale)}
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {loadingEvents ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : selectedEvents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("calendar.noEventsDay")}
                </p>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {selectedEvents.map((event) => {
                      const type = asEventType(event.eventType);
                      return (
                        <motion.li
                          key={event.publicUuid}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          <span
                            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${EVENT_TYPE_CHIP[type]}`}
                          >
                            {t(`calendar.type.${event.eventType}`, {
                              defaultValue: event.eventType,
                            })}
                          </span>
                          <div className="mt-2 text-sm font-semibold text-foreground">
                            {event.title}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={12} />
                              {formatEventTime(event.startsAt, locale)}
                            </span>
                            {event.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={12} />
                                {event.location}
                              </span>
                            ) : null}
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showForm ? (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onSubmit={form.handleSubmit}
                className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("calendar.create")}</h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
                <SectionHelper>{t("help.calendar.section")}</SectionHelper>
                <div>
                  <input
                    name="title"
                    value={form.values.title}
                    onChange={form.handleChange}
                    placeholder={t("calendar.titlePlaceholder")}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <FieldHelper>{t("help.calendar.title")}</FieldHelper>
                </div>
                <div>
                  <select
                    name="eventType"
                    value={form.values.eventType}
                    onChange={form.handleChange}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {CALENDAR_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`calendar.type.${type}`)}
                      </option>
                    ))}
                  </select>
                  <FieldHelper>{t("help.calendar.type")}</FieldHelper>
                </div>
                <div>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    value={form.values.startsAt}
                    onChange={form.handleChange}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <FieldHelper>{t("help.calendar.startsAt")}</FieldHelper>
                </div>
                <div>
                  <input
                    name="location"
                    value={form.values.location}
                    onChange={form.handleChange}
                    placeholder={t("calendar.locationPlaceholder")}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <FieldHelper>{t("help.calendar.location")}</FieldHelper>
                </div>
                <div>
                  <select
                    name="caseId"
                    value={form.values.caseId}
                    onChange={form.handleChange}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("calendar.noCase")}</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} — {c.title}
                      </option>
                    ))}
                  </select>
                  <FieldHelper>{t("help.calendar.case")}</FieldHelper>
                </div>
                <button
                  type="submit"
                  className="h-10 w-full rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {t("calendar.create")}
                </button>
              </motion.form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  void form.setFieldValue(
                    "startsAt",
                    defaultStartForDay(selected),
                  );
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-5 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-secondary/50"
              >
                <Plus size={16} />
                {t("calendar.addEvent")}
              </button>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

import {
  useExtensionDraft,
  usePluginClient,
  usePluginDraftState,
  useRecord,
} from "@caraliom/plugin-sdk/react";
import * as ui from "@caraliom/plugin-sdk/ui";
import * as React from "react";
import { createPluginServices } from "../generated/client";

const { useState, useMemo, useRef } = React;

const CADENCE_DAYS = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  "bi-yearly": 182,
  yearly: 365,
};

const CADENCE_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "bi-yearly": "Every six months",
  yearly: "Yearly",
};

const INTERACTION_TYPES = ["Call", "Message", "Email", "In person", "Event", "Other"];

const styles = {
  screen: {
    minHeight: "100%",
    padding: "18px",
    background: "var(--color-background, var(--caraliom-color-background, #f8fafc))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
  },
  stack: { display: "grid", gap: "14px" },
  card: {
    borderTop: "1px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    padding: "16px 0 0",
  },
  hero: {
    display: "grid",
    gap: "14px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    borderRadius: "10px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    padding: "16px",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: "0 0 5px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: "22px", lineHeight: 1.1, letterSpacing: "-0.03em" },
  copy: {
    margin: "7px 0 0",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "13px",
    lineHeight: 1.45,
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "8px",
  },
  fact: {
    borderLeft: "2px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    padding: "4px 10px",
  },
  factLabel: {
    display: "block",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  factValue: { display: "block", marginTop: "5px", fontSize: "14px", fontWeight: 600 },
  actions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  sectionTitle: { margin: 0, fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em" },
  fieldGrid: { display: "grid", gap: "12px" },
  radioGroup: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  radioOption: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    minHeight: "36px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: "0 10px",
  },
  radioInput: {
    margin: 0,
  },
  label: {
    display: "grid",
    gap: "6px",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontSize: "13px",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    minHeight: "40px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontSize: "14px",
    padding: "8px 10px",
  },
  textarea: {
    width: "100%",
    minHeight: "88px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.45,
    padding: "10px",
    resize: "vertical",
  },
  select: {
    minHeight: "38px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: "0 11px",
  },
  timeline: { display: "grid", gap: "9px" },
  interaction: {
    display: "grid",
    gap: "7px",
    borderTop: "1px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    padding: "12px 0",
  },
  interactionTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  interactionMeta: {
    margin: 0,
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "13px",
    fontWeight: 600,
  },
  notes: {
    margin: 0,
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: 1.45,
  },
  empty: {
    border: "1px dashed var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "13px",
    lineHeight: 1.45,
    padding: "18px",
    textAlign: "center",
  },
};

function formatDate(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "Date unavailable";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTimelineDate(iso) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  const year = date.getFullYear();
  return `${weekday} ${day}${suffix} ${month} ${year}`;
}

function formatDateInput(iso) {
  const date = iso ? new Date(iso) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseInteractionDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return formatDateInput(date) === value ? date : null;
}

function computeDaysUntilDue(contactData, now) {
  if (!contactData?.cadence || !contactData.lastContacted) return null;
  const last = new Date(contactData.lastContacted);
  const calendarDay = (date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const daysSince = calendarDay(now) - calendarDay(last);
  return CADENCE_DAYS[contactData.cadence] - daysSince;
}

export function getDueStatus(contactData, now) {
  if (contactData?.ignoreCadence) {
    return {
      label: "Paused",
      tone: "muted",
      title: "Cadence is paused",
      copy: "This person is hidden from reminders until you resume tracking.",
    };
  }
  if (!contactData?.cadence) {
    return {
      label: "Set a rhythm",
      tone: "neutral",
      title: "No cadence yet",
      copy: "Choose how often you want to stay in touch.",
    };
  }
  if (contactData.overdueOverride) {
    return {
      label: "Needs attention",
      tone: "danger",
      title: "Manually marked due",
      copy: "Follow up when it feels right, then log the interaction here.",
    };
  }
  const daysUntilDue = computeDaysUntilDue(contactData, now);
  if (daysUntilDue === null) {
    return {
      label: "Ready to start",
      tone: "neutral",
      title: "Log your first touchpoint",
      copy: "Your next reminder will be based on when you last spoke.",
    };
  }
  if (!Number.isFinite(daysUntilDue)) {
    return {
      label: "Check the date",
      tone: "warning",
      title: "Last contact date is unavailable",
      copy: "Log a touchpoint to set the next reminder.",
    };
  }
  if (daysUntilDue <= 0) {
    return {
      label: daysUntilDue === 0 ? "Due today" : "Needs attention",
      tone: "danger",
      title: "Time to reconnect",
      copy:
        daysUntilDue === 0
          ? "Today is the next day you planned to check in."
          : "This relationship has passed the cadence you set.",
    };
  }
  const n = Math.ceil(daysUntilDue);
  if (n <= 7) {
    return {
      label: n === 1 ? "Due tomorrow" : `Due in ${n} days`,
      tone: "warning",
      title: "Coming up soon",
      copy: "A lightweight touchpoint this week keeps the rhythm healthy.",
    };
  }
  return {
    label: `Due in ${n} days`,
    tone: "success",
    title: "In rhythm",
    copy: "Nothing urgent. The next reminder is scheduled from your last interaction.",
  };
}

function statusStyle(tone) {
  const tones = {
    danger: {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--caraliom-color-danger, #dc2626), transparent 68%)",
      color: "var(--caraliom-color-danger, #dc2626)",
    },
    warning: {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--caraliom-color-alert), transparent 64%)",
      color: "var(--caraliom-color-alert, #b45309)",
    },
    success: {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--caraliom-color-accent), transparent 66%)",
      color: "var(--caraliom-color-accent, #15803d)",
    },
    muted: {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--color-text-muted, #64748b), transparent 72%)",
      color: "var(--color-text-muted, #64748b)",
    },
    neutral: {
      background: "transparent",
      borderColor: "color-mix(in srgb, var(--caraliom-color-accent, #4f46e5), transparent 72%)",
      color: "var(--caraliom-color-accent, #4f46e5)",
    },
  };
  return {
    ...tones[tone],
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1,
    padding: "6px 9px",
  };
}

export function ContactCadenceTab({ contactId }) {
  const client = usePluginClient();
  const services = useMemo(() => createPluginServices(client), [client]);
  const summary = useExtensionDraft(contactId, { initialValue: {} });
  const history = useRecord("interactions", contactId);
  const contactData = {
    ...summary.value,
    ...(history.value?.state === "value" ? history.value.value : { interactions: [] }),
  };
  const loading = summary.loading || history.loading;
  const loadError = !summary.loaded ? summary.error?.message : history.error?.message;
  const [formDate, setFormDate] = useState(formatDateInput(null));
  const [formType, setFormType] = useState("Call");
  const [formNotes, setFormNotes] = useState("");
  const [pending, setPending] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savedMessage, setSavedMessage] = useState("");
  const busy = useRef(false);
  const currentData = useRef(contactData);
  currentData.current = contactData;
  const formRef = useRef(null);
  const initialFormDate = useRef(formDate);
  const interactionId = useRef(null);
  const dirty = formNotes.length > 0 || formType !== "Call" || formDate !== initialFormDate.current;
  usePluginDraftState({
    dirty: !loading && dirty,
    saving: !!pending,
    save: async () => {
      if (!(await logInteraction())) throw new Error("The touchpoint was not saved.");
    },
  });

  async function saveData(updated, operation, message) {
    if (busy.current) return false;
    busy.current = true;
    setPending(operation);
    setSaveError(null);
    setSavedMessage("");
    try {
      if (!summary.loaded || !history.value || history.error)
        throw new Error("Read saved cadence and history before changing them.");
      const value = Object.fromEntries(
        ["cadence", "lastContacted", "overdueOverride", "ignoreCadence"]
          .filter((key) => updated[key] !== undefined)
          .map((key) => [key, updated[key]]),
      );
      if (operation === "interaction") {
        const base = summary.base;
        await services.storage.commitRelated({
          operationId: client.createOperationId(),
          contactId,
          extension: {
            operation: "put",
            expectedRevision:
              base.state === "missing"
                ? { state: "absent" }
                : { state: "present", revision: base.revision },
            value,
          },
          records: [
            {
              name: "interactions",
              key: contactId,
              operation: "put",
              expectedRevision:
                history.value.state === "missing"
                  ? { state: "absent" }
                  : { state: "present", revision: history.value.revision },
              value: { interactions: updated.interactions },
            },
          ],
        });
        summary.setValue(value);
        await Promise.all([summary.reload(), history.refresh()]);
      } else {
        summary.setValue(value);
        await summary.save();
      }
      setSavedMessage(message);
      return true;
    } catch (error) {
      setSaveError(
        `Could not save. ${error.message || String(error)} ${operation === "interaction" ? "Your notes are still here; try saving again." : "Choose the setting again to retry."}`,
      );
      return false;
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  function updateContactData(patch) {
    const updated = { ...currentData.current, ...patch };
    for (const key of Object.keys(updated)) if (updated[key] === undefined) delete updated[key];
    return saveData(updated, "settings", "Cadence updated.");
  }

  async function logInteraction(event) {
    event?.preventDefault();
    if (busy.current) return false;
    const date = parseInteractionDate(formDate);
    if (!date || formDate > formatDateInput(null)) {
      setSaveError("Choose a valid date on or before today.");
      formRef.current?.querySelector('input[type="date"]')?.focus();
      return false;
    }
    interactionId.current ??= `int_${crypto.randomUUID()}`;
    const submittedDate = formDate;
    const submittedType = formType;
    const submittedNotes = formNotes;
    const interaction = {
      id: interactionId.current,
      date: date.toISOString(),
      type: formType,
      notes: formNotes.trim(),
    };
    const data = currentData.current;
    const previous = new Date(data.lastContacted).getTime();
    const updated = {
      ...data,
      overdueOverride: false,
      lastContacted: previous > date.getTime() ? data.lastContacted : interaction.date,
      interactions: [
        interaction,
        ...(data.interactions || []).filter((item) => item.id !== interaction.id),
      ],
    };
    if (await saveData(updated, "interaction", "Touchpoint saved.")) {
      initialFormDate.current = formatDateInput(null);
      interactionId.current = null;
      setFormDate((current) => (current === submittedDate ? initialFormDate.current : current));
      setFormType((current) => (current === submittedType ? "Call" : current));
      setFormNotes((current) => (current === submittedNotes ? "" : current));
      formRef.current?.querySelector('input[type="date"]')?.focus();
      return true;
    }
    return false;
  }

  if (loading) {
    return React.createElement(ui.PluginLoading, { label: "Loading cadence…" });
  }

  if (loadError) {
    return React.createElement(
      "div",
      { style: styles.screen },
      React.createElement(
        ui.PluginNotice,
        {
          error: true,
          actionLabel: "Retry",
          onAction: () => {
            void summary.reload().catch(() => {});
            void history.refresh().catch(() => {});
          },
        },
        "Could not load cadence: ",
        loadError,
      ),
    );
  }

  const now = new Date();
  const data = contactData || {};
  const status = getDueStatus(data, now);
  const cadence = data.cadence;
  const interactions = [...(data.interactions || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const nextDue =
    CADENCE_DAYS[cadence] &&
    data.lastContacted &&
    Number.isFinite(new Date(data.lastContacted).getTime())
      ? new Date(data.lastContacted)
      : null;
  if (nextDue) nextDue.setDate(nextDue.getDate() + CADENCE_DAYS[cadence]);

  return React.createElement(
    "main",
    { style: styles.screen },
    React.createElement(
      "div",
      { style: styles.stack },
      saveError ? React.createElement(ui.PluginNotice, { error: true }, saveError) : null,
      savedMessage ? React.createElement(ui.PluginNotice, null, savedMessage) : null,
      React.createElement(
        "section",
        { style: styles.hero },
        React.createElement(
          "div",
          { style: styles.heroTop },
          React.createElement(
            "div",
            null,
            React.createElement("p", { style: styles.eyebrow }, "Cadence"),
            React.createElement("h1", { style: styles.title }, status.title),
            React.createElement("p", { style: styles.copy }, status.copy),
          ),
          React.createElement("span", { style: statusStyle(status.tone) }, status.label),
        ),
        React.createElement(
          "div",
          { style: styles.facts },
          React.createElement(Fact, {
            label: "Rhythm",
            value: React.createElement(
              "select",
              {
                value: cadence || "",
                disabled: !!pending,
                onChange: (event) =>
                  updateContactData({ cadence: event.target.value || undefined }),
                style: { ...styles.select, width: "100%", marginTop: "2px" },
                "aria-label": "Contact cadence",
              },
              React.createElement("option", { value: "" }, "Set cadence"),
              Object.entries(CADENCE_LABELS).map(([value, label]) =>
                React.createElement("option", { key: value, value }, label),
              ),
            ),
          }),
          React.createElement(Fact, {
            label: "Last contact",
            value: formatDate(data.lastContacted),
          }),
          React.createElement(Fact, {
            label: "Next due",
            value: nextDue
              ? formatDate(nextDue.toISOString())
              : cadence
                ? "After first interaction"
                : "After cadence is set",
          }),
        ),
        React.createElement(
          "div",
          { style: styles.actions },
          React.createElement(
            ui.Button,
            {
              type: "button",
              variant: data.overdueOverride ? "primary" : "secondary",
              onClick: () => updateContactData({ overdueOverride: !data.overdueOverride }),
              disabled: !!pending || !cadence || !!data.ignoreCadence,
              "aria-pressed": !!data.overdueOverride,
              style: { minHeight: "38px" },
            },
            data.overdueOverride ? "Clear manual reminder" : "Mark due now",
          ),
          React.createElement(
            ui.Button,
            {
              type: "button",
              variant: data.ignoreCadence ? "primary" : "secondary",
              onClick: () => updateContactData({ ignoreCadence: !data.ignoreCadence }),
              disabled: !!pending,
              "aria-pressed": !!data.ignoreCadence,
              style: { minHeight: "38px" },
            },
            data.ignoreCadence ? "Resume" : "Pause",
          ),
        ),
      ),
      React.createElement(
        "form",
        {
          style: styles.card,
          ref: formRef,
          onSubmit: logInteraction,
          "aria-label": "Log a touchpoint",
          "aria-busy": pending === "interaction",
        },
        React.createElement(
          "div",
          { style: styles.sectionHeader },
          React.createElement("h2", { style: styles.sectionTitle }, "Log a touchpoint"),
        ),
        React.createElement(
          "div",
          { style: styles.fieldGrid },
          React.createElement(
            "label",
            { style: styles.label },
            "Date",
            React.createElement("input", {
              type: "date",
              required: true,
              max: formatDateInput(null),
              disabled: !!pending,
              value: formDate,
              onChange: (event) => setFormDate(event.target.value),
              style: styles.input,
            }),
          ),
          React.createElement(
            "fieldset",
            { style: { ...styles.label, border: 0, margin: 0, padding: 0 } },
            React.createElement("legend", { style: { marginBottom: "6px" } }, "Type"),
            React.createElement(
              "div",
              { style: styles.radioGroup },
              INTERACTION_TYPES.map((type) =>
                React.createElement(
                  "label",
                  { key: type, style: styles.radioOption },
                  React.createElement("input", {
                    type: "radio",
                    disabled: !!pending,
                    name: "interaction-type",
                    value: type,
                    checked: formType === type,
                    onChange: () => setFormType(type),
                    style: styles.radioInput,
                  }),
                  type,
                ),
              ),
            ),
          ),
          React.createElement(
            "label",
            { style: styles.label },
            "Notes",
            React.createElement("textarea", {
              value: formNotes,
              disabled: !!pending,
              onChange: (event) => setFormNotes(event.target.value),
              placeholder: "A quick note for future you...",
              style: styles.textarea,
            }),
          ),
          React.createElement(
            "div",
            { style: styles.actions },
            React.createElement(
              ui.Button,
              { type: "submit", variant: "primary", disabled: !!pending || !formDate },
              pending === "interaction" ? "Saving…" : "Save touchpoint",
            ),
          ),
        ),
      ),
      React.createElement(
        "section",
        { style: styles.card },
        React.createElement(
          "div",
          { style: styles.sectionHeader },
          React.createElement("h2", { style: styles.sectionTitle }, "Recent interactions"),
          React.createElement("span", { style: statusStyle("muted") }, interactions.length),
        ),
        interactions.length === 0
          ? React.createElement(
              "div",
              { style: styles.empty },
              "No interactions logged yet. Add the first touchpoint and this tab will turn into a simple relationship timeline.",
            )
          : React.createElement(
              "div",
              { style: styles.timeline },
              interactions.map((interaction) =>
                React.createElement(
                  "article",
                  { key: interaction.id, style: styles.interaction },
                  React.createElement(
                    "div",
                    { style: styles.interactionTop },
                    React.createElement(
                      "p",
                      { style: styles.interactionMeta },
                      `${formatTimelineDate(interaction.date)} - ${interaction.type.toLowerCase()}`,
                    ),
                  ),
                  interaction.notes
                    ? React.createElement("p", { style: styles.notes }, interaction.notes)
                    : null,
                ),
              ),
            ),
      ),
    ),
  );
}

function Fact({ label, value }) {
  return React.createElement(
    "div",
    { style: styles.fact },
    React.createElement("span", { style: styles.factLabel }, label),
    React.createElement("span", { style: styles.factValue }, value),
  );
}

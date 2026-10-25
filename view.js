import { usePluginClient, usePluginDraftState } from "@caraliom/plugin-sdk/react";
import * as ui from "@caraliom/plugin-sdk/ui";
import * as React from "react";
import { useContactScan } from "./shared/use-contact-scan";
import { useExtensionCollection } from "./shared/use-extension-collection";
import { createPluginServices } from "./generated/client";

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

const IGNORE_CADENCE_VALUE = "__ignore__";

const GROUP_CONFIG = [
  {
    key: "unset",
    label: "Need setup",
    description: "Choose a cadence to start tracking this relationship.",
  },
  {
    key: "no-outreach",
    label: "Need outreach",
    description: "Cadence is set. Log a first touchpoint to start tracking.",
  },
  {
    key: "overdue",
    label: "Needs attention",
    description: "People whose rhythm has slipped or were manually marked due.",
  },
  { key: "7-days", label: "Coming up", description: "Worth reaching out to this week." },
  { key: "30-days", label: "This month", description: "Relationships to keep warm soon." },
  { key: "3-months", label: "Next few months", description: "On track, but visible." },
  {
    key: "all",
    label: "Later",
    description: "Healthy relationships with more room before the next touchpoint.",
  },
  {
    key: "ignored",
    label: "Paused",
    description: "Hidden from cadence pressure until re-enabled.",
  },
];

const styles = {
  screen: {
    minHeight: "100%",
    padding: "20px",
    background: "var(--color-background, var(--caraliom-color-background, #f8fafc))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
  },
  stack: { display: "grid", gap: "16px", maxWidth: "1120px", margin: "0 auto" },
  hero: {
    display: "grid",
    gap: "16px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    borderRadius: "10px",
    padding: "18px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
  },
  heroTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: "0 0 6px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: "28px", lineHeight: 1.05, letterSpacing: "-0.04em" },
  copy: {
    margin: "8px 0 0",
    maxWidth: "640px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  search: {
    minWidth: "240px",
    flex: "0 1 320px",
    minHeight: "42px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    padding: "0 16px",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
  },
  stat: {
    borderLeft: "2px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    padding: "4px 12px",
  },
  statValue: { display: "block", fontSize: "24px", fontWeight: 850, lineHeight: 1 },
  statLabel: {
    display: "block",
    marginTop: "6px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "12px",
    fontWeight: 750,
  },
  section: { display: "grid", gap: "10px" },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "baseline",
  },
  sectionTitle: { margin: 0, fontSize: "15px", fontWeight: 800, letterSpacing: "-0.01em" },
  sectionDescription: {
    margin: "3px 0 0",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "13px",
  },
  countPill: {
    border: "1px solid var(--color-border, var(--caraliom-color-border, #e5e7eb))",
    borderRadius: "6px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 9px",
  },
  card: {
    display: "grid",

    alignItems: "center",
    gap: "14px 12px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #cbd5e1))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    padding: "16px",
  },
  fact: { minWidth: 0 },
  factLabel: {
    display: "block",
    marginBottom: "4px",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    fontSize: "11px",
    fontWeight: 750,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  factValue: {
    display: "block",
    overflow: "hidden",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontSize: "13px",
    lineHeight: 1.25,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  name: {
    display: "block",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  select: {
    width: "100%",
    minHeight: "38px",
    border: "1px solid var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "var(--color-surface, var(--caraliom-color-surface, #fff))",
    color: "var(--color-text, var(--caraliom-color-text, #111827))",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 750,
    padding: "0 11px",
  },
  saveError: {
    margin: 0,
    border: "1px solid var(--caraliom-color-danger, #dc2626)",
    borderRadius: "8px",
    color: "var(--caraliom-color-danger, #dc2626)",
    fontSize: "13px",
    padding: "10px 12px",
  },
  empty: {
    border: "1px dashed var(--color-border, var(--caraliom-color-border, #d1d5db))",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--color-text-muted, var(--caraliom-color-muted, #64748b))",
    padding: "24px",
    textAlign: "center",
  },
};

function calendarDay(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function computeDaysUntilDue(contactData, now) {
  if (!contactData?.cadence) return null;
  const cadenceDays = CADENCE_DAYS[contactData.cadence];
  if (!cadenceDays) return Number.NaN;
  if (!contactData.lastContacted) return null;
  const lastContacted = new Date(contactData.lastContacted);
  if (!Number.isFinite(lastContacted.getTime())) return Number.NaN;
  const daysSince = calendarDay(now) - calendarDay(lastContacted);
  return cadenceDays - daysSince;
}

function computeGroupKey(cd, now) {
  if (cd?.ignoreCadence) return "ignored";
  if (!cd?.cadence) return "unset";
  if (!cd.lastContacted) return "no-outreach";
  if (cd.overdueOverride) return "overdue";
  const daysUntilDue = computeDaysUntilDue(cd, now);
  if (Number.isNaN(daysUntilDue)) return "overdue";
  if (daysUntilDue === null) return "no-outreach";
  if (daysUntilDue <= 0) return "overdue";
  if (daysUntilDue <= 7) return "7-days";
  if (daysUntilDue <= 30) return "30-days";
  if (daysUntilDue <= 91) return "3-months";
  return "all";
}

function formatDate(iso) {
  if (!iso) return "Never contacted";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getContactName(contact) {
  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(" ");
  return (
    contact.displayName || fullName || contact.emails?.[0]?.value || contact.id || "Unnamed contact"
  );
}

function getDueLine(cd, now) {
  if (cd?.ignoreCadence) return { text: "Paused", color: "var(--color-text-muted, #64748b)" };
  if (!cd?.cadence) return { text: "No cadence set", color: "var(--color-text-muted, #64748b)" };
  if (cd.overdueOverride)
    return { text: "Manually marked due", color: "var(--caraliom-color-danger)" };
  const daysUntilDue = computeDaysUntilDue(cd, now);
  if (Number.isNaN(daysUntilDue)) {
    return { text: "Due date unavailable", color: "var(--color-text-muted, #64748b)" };
  }
  if (daysUntilDue === null)
    return { text: "No touchpoints yet", color: "var(--caraliom-color-muted)" };
  if (daysUntilDue <= 0) {
    const days = Math.max(0, Math.abs(Math.floor(daysUntilDue || 0)));
    return {
      text: days === 0 ? "Due today" : `${days} ${days === 1 ? "day" : "days"} overdue`,
      color: "var(--caraliom-color-danger)",
    };
  }
  const n = Math.ceil(daysUntilDue);
  return {
    text: n === 1 ? "Due tomorrow" : `Due in ${n} days`,
    color: n <= 7 ? "var(--caraliom-color-alert)" : "var(--caraliom-color-accent)",
  };
}

function getNextDue(cd) {
  if (!cd?.cadence) return "After cadence is set";
  const cadenceDays = CADENCE_DAYS[cd.cadence];
  if (!cadenceDays) return "Date unavailable";
  if (!cd.lastContacted) return "After first interaction";
  const nextDue = new Date(cd.lastContacted);
  if (!Number.isFinite(nextDue.getTime())) return "Date unavailable";
  nextDue.setDate(nextDue.getDate() + cadenceDays);
  return formatDate(nextDue);
}

function createGroups(contactList, contactDataMap, now) {
  const groups = {
    overdue: [],
    "7-days": [],
    "30-days": [],
    "3-months": [],
    unset: [],
    "no-outreach": [],
    all: [],
    ignored: [],
  };
  for (const contact of contactList) {
    groups[computeGroupKey(contactDataMap[contact.id], now)].push(contact);
  }
  return groups;
}

function matchesQuery(contact, query) {
  if (!query.trim()) return true;
  const normalize = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const name = normalize(getContactName(contact));
  const email =
    contact.emails
      ?.map((entry) => entry.value)
      .join(" ")
      .toLowerCase() || "";
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every((term) => `${name} ${normalize(email)}`.includes(term));
}

export function ContactCadenceView() {
  const client = usePluginClient();
  const services = useMemo(() => createPluginServices(client), [client]);
  const [saveError, setSaveError] = useState(null);
  const [savingContactIds, setSavingContactIds] = useState({});
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [groupFilter, setGroupFilter] = useState(null);
  const [drafts, setDrafts] = useState({});
  const bases = useRef({});
  const draftRef = useRef(drafts);
  draftRef.current = drafts;
  const busyIds = useRef(new Set());
  const selectRefs = useRef(new Map());
  const [savedMessage, setSavedMessage] = useState("");
  const scan = useContactScan(
    ["id", "displayName", "firstName", "surname", "company", "emails"],
    attempt,
  );
  const ids = useMemo(() => scan.people.map((contact) => contact.id), [scan.people]);
  const extensions = useExtensionCollection(ids, attempt);
  const allContacts = scan.people;
  const contactDataMap = useMemo(
    () => ({ ...extensions.values, ...drafts }),
    [extensions.values, drafts],
  );
  const loading = scan.loading || extensions.loading;
  const error = scan.error || extensions.error;
  const saving = Object.keys(savingContactIds).length > 0;

  async function saveCadence(contactId, contactName, updated) {
    if (busyIds.current.has(contactId)) throw new Error("This contact is already saving.");
    const base = bases.current[contactId] ?? extensions.rows[contactId];
    if (!base || extensions.error) throw new Error("Read the saved cadence before changing it.");
    busyIds.current.add(contactId);
    setSaveError(null);
    setSavedMessage("");
    setSavingContactIds((current) => ({ ...current, [contactId]: true }));
    try {
      const result = await services.storage.contactExtension.put(contactId, {
        operationId: client.createOperationId(),
        expectedRevision:
          base.state === "missing"
            ? { state: "absent" }
            : { state: "present", revision: base.revision },
        value: updated,
      });
      extensions.adopt(contactId, result);
      bases.current[contactId] = result;
      setDrafts((current) => {
        if (JSON.stringify(current[contactId]) !== JSON.stringify(updated)) return current;
        const next = { ...current };
        delete next[contactId];
        delete bases.current[contactId];
        return next;
      });
      setSavedMessage(`Cadence updated for ${contactName}.`);
      requestAnimationFrame(() => selectRefs.current.get(contactId)?.focus());
    } finally {
      busyIds.current.delete(contactId);
      setSavingContactIds((current) => {
        const next = { ...current };
        delete next[contactId];
        return next;
      });
    }
  }
  function updateCadence(contactId, contactName, selection) {
    if (busyIds.current.has(contactId) || !extensions.rows[contactId]) return;
    const updated = { ...(draftRef.current[contactId] ?? extensions.values[contactId] ?? {}) };
    if (selection === IGNORE_CADENCE_VALUE) updated.ignoreCadence = true;
    else {
      delete updated.ignoreCadence;
      if (selection) updated.cadence = selection;
      else delete updated.cadence;
    }
    bases.current[contactId] ??= structuredClone(extensions.rows[contactId]);
    setDrafts((current) => ({ ...current, [contactId]: updated }));
    void saveCadence(contactId, contactName, updated).catch((cause) => {
      setSaveError(
        `Could not update cadence for ${contactName}. ${cause.message || String(cause)} Your choice is preserved.`,
      );
    });
  }
  usePluginDraftState({
    dirty: Object.keys(drafts).length > 0,
    saving,
    save: async () => {
      for (const [id, value] of Object.entries(draftRef.current))
        await saveCadence(
          id,
          getContactName(allContacts.find((person) => person.id === id) || {}),
          value,
        );
    },
  });

  if (loading) {
    return React.createElement(ui.PluginLoading, { label: "Loading contact cadence…" });
  }

  if (error) {
    return React.createElement(
      ui.PluginPage,
      { title: "Cadence" },
      React.createElement(
        ui.PluginNotice,
        { error: true, actionLabel: "Retry", onAction: () => setAttempt((value) => value + 1) },
        "Could not load cadence. ",
        error,
      ),
    );
  }

  const now = new Date();
  const summaryGroups = createGroups(allContacts, contactDataMap, now);
  const visibleContacts = allContacts
    .filter((contact) => {
      const key = computeGroupKey(contactDataMap[contact.id], now);
      return (
        matchesQuery(contact, query) &&
        (!groupFilter ||
          (groupFilter === "on-track"
            ? ["30-days", "3-months", "all"].includes(key)
            : key === groupFilter))
      );
    })
    .sort((a, b) => {
      const aDue = computeDaysUntilDue(contactDataMap[a.id], now) ?? -Infinity;
      const bDue = computeDaysUntilDue(contactDataMap[b.id], now) ?? -Infinity;
      return aDue - bDue || getContactName(a).localeCompare(getContactName(b));
    });
  const visibleGroups = createGroups(visibleContacts, contactDataMap, now);
  const overdueCount = summaryGroups.overdue.length;
  const weekCount = summaryGroups["7-days"].length;
  const healthyCount =
    summaryGroups["30-days"].length + summaryGroups["3-months"].length + summaryGroups.all.length;
  const unsetCount = summaryGroups.unset.length;
  const noOutreachCount = summaryGroups["no-outreach"].length;

  return React.createElement(
    ui.PluginPage,
    {
      title: "Cadence",
      description:
        "Make time for your people. Choose a rhythm and keep a record of your conversations.",
    },
    React.createElement(
      "div",
      { style: styles.stack },
      React.createElement(
        "header",
        { style: { ...styles.hero, padding: 0, border: 0, background: "transparent", gap: "4px" } },
        React.createElement(
          "div",
          { style: styles.heroTop },
          React.createElement(
            "div",
            null,

            React.createElement(
              "h2",
              { style: { ...styles.title, fontSize: "18px", fontWeight: 600 } },
              overdueCount > 0
                ? `${overdueCount} ${overdueCount === 1 ? "person to reconnect with" : "people to reconnect with"}`
                : allContacts.length === 0
                  ? "Start with your first contact"
                  : unsetCount === allContacts.length
                    ? "Find your rhythm"
                    : "No overdue reminders",
            ),
            React.createElement(
              "p",
              { style: styles.copy },
              "Choose a group below or search for someone.",
            ),
          ),
          React.createElement(ui.SearchInput, {
            label: "Search cadence contacts",
            value: query,
            onValueChange: setQuery,
            placeholder: "Name or email…",
          }),
        ),
        React.createElement(
          "div",
          { className: "plugin-metrics", role: "group", "aria-label": "Filter cadence" },
          [
            { key: "overdue", value: overdueCount, label: "Need attention" },
            { key: "7-days", value: weekCount, label: "Due this week" },
            { key: "on-track", value: healthyCount, label: "On track" },
            { key: "unset", value: unsetCount, label: "Need setup" },
            { key: "no-outreach", value: noOutreachCount, label: "Need outreach" },
            { key: "ignored", value: summaryGroups.ignored.length, label: "Paused" },
          ].map((item) =>
            React.createElement(StatCard, {
              ...item,
              selected: groupFilter === item.key,
              onClick: () => setGroupFilter(groupFilter === item.key ? null : item.key),
            }),
          ),
        ),
      ),
      saveError ? React.createElement(ui.PluginNotice, { error: true }, saveError) : null,
      savedMessage ? React.createElement(ui.PluginNotice, null, savedMessage) : null,
      groupFilter || query
        ? React.createElement(
            "div",
            { className: "plugin-toolbar" },
            React.createElement(
              "p",
              { role: "status", className: "plugin-result-count" },
              `${visibleContacts.length} of ${allContacts.length} contacts`,
            ),
            React.createElement(
              ui.Button,
              {
                type: "button",
                variant: "ghost",
                onClick: () => {
                  setGroupFilter(null);
                  setQuery("");
                },
              },
              "Show all contacts",
            ),
          )
        : null,
      visibleContacts.length === 0
        ? React.createElement(ui.PluginEmptyState, {
            title: query.trim()
              ? "No matching contacts"
              : groupFilter
                ? "No contacts in this view"
                : "No contacts to track yet",
            description:
              query.trim() || groupFilter
                ? "Clear your search or choose another cadence group."
                : "Add a contact, then choose how often you would like to stay in touch.",
            actionLabel: query.trim() || groupFilter ? "Show all contacts" : "Go to contacts",
            onAction: () => {
              if (query.trim() || groupFilter) {
                setQuery("");
                setGroupFilter(null);
              } else services.navigation.openContacts({ operationId: client.createOperationId() });
            },
          })
        : [...GROUP_CONFIG]
            .sort(
              (a, b) =>
                ["overdue", "no-outreach", "7-days", "30-days", "3-months", "all", "unset", "ignored"].indexOf(
                  a.key,
                ) -
                ["overdue", "no-outreach", "7-days", "30-days", "3-months", "all", "unset", "ignored"].indexOf(
                  b.key,
                ),
            )
            .map((group) => {
              const groupContacts = visibleGroups[group.key];
              if (groupContacts.length === 0) return null;
              return React.createElement(
                "section",
                { key: group.key, style: styles.section },
                React.createElement(
                  "div",
                  { style: styles.sectionHeader },
                  React.createElement(
                    "div",
                    null,
                    React.createElement("h3", { style: styles.sectionTitle }, group.label),
                    React.createElement(
                      "p",
                      { style: styles.sectionDescription },
                      group.description,
                    ),
                  ),
                  React.createElement("span", { style: styles.countPill }, groupContacts.length),
                ),
                groupContacts.map((contact) => {
                  const cd = contactDataMap[contact.id] || {};
                  const name = getContactName(contact);
                  const lastContacted = formatDate(cd.lastContacted);
                  const nextDue = getNextDue(cd);
                  const dueLine = getDueLine(cd, now);
                  const openContact = () =>
                    services.navigation.openContact(contact.id, {
                      operationId: client.createOperationId(),
                      tabId: "contact-cadence",
                    });
                  return React.createElement(
                    "article",
                    {
                      key: contact.id,
                      className: "cadence-contact-row",
                      style: styles.card,
                    },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "cadence-contact-name",
                        title: name,
                        onClick: openContact,
                      },
                      React.createElement(ui.Avatar, { name }),
                      React.createElement("span", null, name),
                    ),
                    React.createElement(
                      "div",
                      { style: styles.fact },
                      React.createElement(
                        "select",
                        {
                          ref: (element) => {
                            if (element) selectRefs.current.set(contact.id, element);
                            else selectRefs.current.delete(contact.id);
                          },
                          value: cd.ignoreCadence ? IGNORE_CADENCE_VALUE : cd.cadence || "",
                          disabled: Boolean(savingContactIds[contact.id]),
                          onChange: (event) => updateCadence(contact.id, name, event.target.value),
                          onClick: (event) => event.stopPropagation(),
                          onKeyDown: (event) => event.stopPropagation(),
                          style: styles.select,
                          "aria-label": `Cadence for ${name}`,
                        },
                        React.createElement("option", { value: "" }, "Set cadence"),
                        React.createElement(
                          "option",
                          { value: IGNORE_CADENCE_VALUE },
                          "Pause tracking",
                        ),
                        Object.entries(CADENCE_LABELS).map(([value, label]) =>
                          React.createElement("option", { key: value, value }, label),
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "cadence-contact-schedule" },
                      React.createElement(
                        "strong",
                        { style: { color: dueLine.color, fontSize: "13px", fontWeight: 600 } },
                        dueLine.text,
                      ),
                      React.createElement(
                        "span",
                        { title: `Next due: ${nextDue}` },
                        `Last contact: ${lastContacted}`,
                      ),
                    ),
                  );
                }),
              );
            }),
    ),
  );
}

function StatCard({ value, label, selected, onClick }) {
  return React.createElement(
    "button",
    { type: "button", className: "plugin-metric", "aria-pressed": selected, onClick },
    React.createElement("span", { style: styles.statValue }, value),
    React.createElement("span", { style: styles.statLabel }, label),
  );
}

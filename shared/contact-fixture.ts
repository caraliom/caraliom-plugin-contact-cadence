import type { Contact } from "@caraliom/core";
import {
  contactGetPayloadSchema,
  contactQueryPayloadSchema,
  contactSubscribePayloadSchema,
  type JsonValue,
} from "@caraliom/plugin-sdk/client";
import { createPluginTestClient } from "@caraliom/plugin-sdk/testing";

/** Small paged host double; client wire/result validation remains the production implementation. */
export function createContactViewFixture(initial: Contact[], pageSize = 100) {
  let people = initial;
  let sequence = 0;
  let failScan = false;
  const subscriptions = new Set<string>();
  const calls: Array<{ method: string; payload: JsonValue }> = [];
  const navigation: Array<JsonValue> = [];
  const fixture = createPluginTestClient((request) => {
    calls.push({ method: request.method, payload: request.payload });
    if (request.method === "subscriptions.dispose") {
      subscriptions.delete((request.payload as { subscriptionId: string }).subscriptionId);
      return null;
    }
    if (request.method.startsWith("navigation.")) {
      navigation.push(request.payload);
      return null;
    }
    if (request.method === "contacts.get") {
      const { contactId, fields } = contactGetPayloadSchema.parse(request.payload);
      const person = people.find((person) => person.id === contactId);
      return person
        ? ({
            state: "value",
            contactId,
            revision: `row:${sequence}:${person.id}`,
            contact: Object.fromEntries(
              fields
                .filter((field) => person[field] !== undefined)
                .map((field) => [field, person[field]]),
            ),
          } as JsonValue)
        : { state: "missing", contactId };
    }
    const subscribed = request.method === "contacts.subscribe";
    const input = subscribed ? contactSubscribePayloadSchema.parse(request.payload) : undefined;
    const query = input?.query ?? contactQueryPayloadSchema.parse(request.payload);
    const offset = query.cursor ? Number(query.cursor) : 0;
    const selected = people.slice(offset, offset + Math.min(pageSize, query.limit));
    const returned = offset + selected.length;
    const page = {
      items: selected.map((person) => ({
        contactId: person.id,
        contact: Object.fromEntries(
          query.fields
            .filter((field) => person[field] !== undefined)
            .map((field) => [field, person[field]]),
        ),
        revision: `row:${sequence}:${person.id}`,
      })),
      snapshotRevision: `contacts:${sequence}`,
      sequence,
      ...(returned < people.length ? { cursor: String(returned) } : {}),
    };
    if (input) {
      subscriptions.add(input.subscriptionId);
      return {
        subscriptionId: input.subscriptionId,
        snapshotRevision: page.snapshotRevision,
        sequence,
        value: page,
      } as JsonValue;
    }
    if (request.method !== "contacts.scan") throw new Error("Unexpected fixture request");
    if (failScan) throw new Error("Contact storage unavailable");
    return {
      page,
      progress: { returned, totalMatches: people.length },
      done: returned === people.length,
    } as JsonValue;
  });
  return {
    ...fixture,
    calls,
    navigation,
    failScan() {
      failScan = true;
    },
    update(next: Contact[]) {
      people = next;
      sequence++;
      for (const subscriptionId of subscriptions)
        fixture.notify({
          type: "notification",
          subscriptionId,
          sequence,
          snapshotRevision: `contacts:${sequence}` as never,
          invalidated: true,
        });
    },
    get activeSubscriptions() {
      return subscriptions.size;
    },
  };
}

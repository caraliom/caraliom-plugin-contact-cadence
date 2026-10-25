import {
  type ContactField,
  type ContactPage,
  contactClient,
  type PluginSubscription,
  type ProjectedContact,
} from "@caraliom/plugin-sdk/client";
import { usePluginClient } from "@caraliom/plugin-sdk/react";
import { useEffect, useMemo, useState } from "react";

/** Collection views use explicit projections and subscribe before scanning bounded pages. */
export function useContactScan<P extends ContactField>(fields: readonly P[], attempt = 0) {
  const client = usePluginClient();
  const contacts = useMemo(() => contactClient(client), [client]);
  const projection = JSON.stringify(fields);
  const [state, setState] = useState<{
    people: ProjectedContact<P>["contact"][];
    loading: boolean;
    error: string;
    progress: { returned: number; totalMatches: number };
  }>({ people: [], loading: true, error: "", progress: { returned: 0, totalMatches: 0 } });

  useEffect(() => {
    const abort = new AbortController();
    const query = { fields: JSON.parse(projection) as P[], limit: 100 };
    let wanted = false;
    let working = false;
    let version = 0;
    let subscription: PluginSubscription<ContactPage<P>> | undefined;
    const refresh = async () => {
      wanted = true;
      if (working || abort.signal.aborted) return;
      working = true;
      try {
        while (wanted && !abort.signal.aborted) {
          wanted = false;
          const started = version;
          setState((previous) => ({ ...previous, loading: true, error: "" }));
          const people: ProjectedContact<P>["contact"][] = [];
          for await (const { page, progress } of contacts.scan(query, { signal: abort.signal })) {
            people.push(...page.items.map((item) => item.contact));
            if (!abort.signal.aborted) setState((previous) => ({ ...previous, progress }));
          }
          if (!abort.signal.aborted && started === version)
            setState((previous) => ({ ...previous, people, loading: false }));
        }
      } catch (cause) {
        if (!abort.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: cause instanceof Error ? cause.message : String(cause),
          }));
      } finally {
        working = false;
      }
    };
    void contacts
      .subscribe(
        query,
        () => {
          version++;
          return refresh();
        },
        { signal: abort.signal },
      )
      .then(async (started) => {
        subscription = started;
        if (abort.signal.aborted) await started.dispose();
        else await refresh();
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: cause instanceof Error ? cause.message : String(cause),
          }));
      });
    return () => {
      abort.abort();
      void subscription?.dispose().catch(() => {});
    };
  }, [contacts, projection, attempt]);

  return state;
}

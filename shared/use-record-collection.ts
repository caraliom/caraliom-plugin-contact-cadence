import {
  type ExpectedRevision,
  namedRecordClient,
  type RecordRead,
} from "@caraliom/plugin-sdk/client";
import { usePluginClient } from "@caraliom/plugin-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Named history views observe one collection and consume bounded immutable pages. */
export function useRecordCollection<T>(name: string, attempt = 0) {
  const client = usePluginClient();
  const records = useMemo(() => namedRecordClient<T>(client, name), [client, name]);
  const revision = useRef(0);
  const refreshRequested = useRef<() => Promise<void>>(undefined);
  const [state, setState] = useState<{
    rows: Record<string, Extract<RecordRead<T>, { state: "value" }>>;
    loading: boolean;
    loaded: boolean;
    error: string;
  }>({ rows: {}, loading: true, loaded: false, error: "" });
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const abort = new AbortController();
    let subscription: Awaited<ReturnType<typeof records.subscribeList>> | undefined;
    let wanted = false;
    let working = false;
    const refresh = async () => {
      wanted = true;
      if (working || abort.signal.aborted) return;
      working = true;
      try {
        while (wanted && !abort.signal.aborted) {
          wanted = false;
          const version = revision.current;
          setState((previous) => ({ ...previous, loading: true, error: "" }));
          const rows: typeof state.rows = {};
          for await (const page of records.iterate({ limit: 100 }, { signal: abort.signal }))
            for (const { key, ...row } of page.items) rows[key] = { state: "value", ...row };
          if (!abort.signal.aborted && version === revision.current)
            setState({ rows, loading: false, loaded: true, error: "" });
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
    refreshRequested.current = refresh;
    void records
      .subscribeList(
        { limit: 100 },
        () => {
          revision.current++;
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
      if (refreshRequested.current === refresh) refreshRequested.current = undefined;
      void subscription?.dispose().catch(() => {});
    };
  }, [records, attempt]);

  const adopt = useCallback((key: string, result: RecordRead<T>) => {
    revision.current++;
    setState((previous) => {
      const rows = { ...previous.rows };
      if (result.state === "missing") delete rows[key];
      else rows[key] = result;
      const next = { ...previous, rows };
      latest.current = next;
      return next;
    });
    void refreshRequested.current?.();
  }, []);
  const expected = useCallback((key: string): ExpectedRevision => {
    const current = latest.current;
    if (!current.loaded || current.error)
      throw new Error("Read the saved collection before changing it.");
    const row = current.rows[key];
    return row ? { state: "present", revision: row.revision } : { state: "absent" };
  }, []);
  const values = useMemo(
    () => Object.fromEntries(Object.entries(state.rows).map(([key, row]) => [key, row.value])),
    [state.rows],
  );
  return { ...state, values, expected, adopt };
}

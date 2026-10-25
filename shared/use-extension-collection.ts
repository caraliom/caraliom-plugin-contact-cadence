import { type ExpectedRevision, extensionClient, type RecordRead } from "@caraliom/plugin-sdk/client";
import { usePluginClient } from "@caraliom/plugin-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Read only explicitly selected owners' records, with at most four requests in flight. */
export function useExtensionCollection<T>(contactIds: readonly string[], attempt = 0) {
  const client = usePluginClient();
  const extension = useMemo(() => extensionClient<T>(client), [client]);
  const version = useRef(0);
  const [state, setState] = useState<{
    rows: Record<string, RecordRead<T>>;
    loading: boolean;
    loaded: boolean;
    error: string;
  }>({ rows: {}, loading: true, loaded: false, error: "" });
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const abort = new AbortController();
    const started = ++version.current;
    const rows: typeof state.rows = {};
    let offset = 0;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    const read = async () => {
      while (offset < contactIds.length && !abort.signal.aborted) {
        const id = contactIds[offset++];
        if (id) rows[id] = await extension.read(id, { signal: abort.signal });
      }
    };
    void Promise.all(Array.from({ length: Math.min(4, contactIds.length) }, read))
      .then(() => {
        if (!abort.signal.aborted && started === version.current)
          setState({ rows, loading: false, loaded: true, error: "" });
      })
      .catch((cause) => {
        if (!abort.signal.aborted && started === version.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: cause instanceof Error ? cause.message : String(cause),
          }));
        abort.abort();
      });
    return () => {
      abort.abort();
    };
  }, [extension, contactIds, attempt]);
  const adopt = useCallback((id: string, row: RecordRead<T>) => {
    version.current++;
    setState((previous) => {
      const next = { ...previous, rows: { ...previous.rows, [id]: row }, loading: false };
      latest.current = next;
      return next;
    });
  }, []);
  const expected = useCallback((id: string): ExpectedRevision => {
    const current = latest.current;
    const row = current.rows[id];
    if (!current.loaded || current.error || !row)
      throw new Error("Read the saved contact data before changing it.");
    return row.state === "missing"
      ? { state: "absent" }
      : { state: "present", revision: row.revision };
  }, []);
  const values = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.rows).flatMap(([id, row]) =>
          row.state === "value" ? [[id, row.value]] : [],
        ),
      ),
    [state.rows],
  );
  return { ...state, values, expected, adopt };
}

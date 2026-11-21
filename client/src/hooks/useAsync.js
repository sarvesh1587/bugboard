import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../api/client';

/**
 * Small data-fetching hook: { data, loading, error, reload, setData }.
 * Ignores out-of-order responses so fast filter changes never show stale data.
 */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const callId = useRef(0);

  const run = useCallback(() => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn()
      .then((data) => id === callId.current && setState({ data, loading: false, error: null }))
      .catch((err) => id === callId.current && setState((s) => ({ ...s, loading: false, error: errMsg(err) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}

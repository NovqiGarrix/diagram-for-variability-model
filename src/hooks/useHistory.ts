import { useState, useCallback, useRef } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // A ref to track if the next update should push to history
  const isNextUpdateNewRef = useRef(true);

  const commitHistory = useCallback(() => {
    isNextUpdateNewRef.current = true;
  }, []);

  const setPresent = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setState((currentState) => {
        const resolvedState =
          typeof newState === 'function'
            ? (newState as Function)(currentState.present)
            : newState;

        // If the state hasn't changed, do nothing
        if (JSON.stringify(currentState.present) === JSON.stringify(resolvedState)) {
          return currentState;
        }

        if (isNextUpdateNewRef.current) {
          // Push to history
          isNextUpdateNewRef.current = false;
          return {
            past: [...currentState.past, currentState.present],
            present: resolvedState,
            future: [],
          };
        } else {
          // Overwrite present
          return {
            ...currentState,
            present: resolvedState,
          };
        }
      });
    },
    []
  );

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      isNextUpdateNewRef.current = true; // Any new action should branch

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      isNextUpdateNewRef.current = true; // Any new action should branch

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return {
    state: state.present,
    setPresent,
    commitHistory,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

"use client";

import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
  useSyncExternalStore,
} from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

interface QueryBoundaryProps {
  children: ReactNode;
  pendingFallback: ReactNode;
  errorFallback: (props: ErrorFallbackProps) => ReactNode;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorFallbackProps) => ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  error?: Error;
}

const subscribeToHydration = () => () => undefined;

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error("An unknown request error occurred"),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Query boundary caught an error", error, info);
  }

  private reset = () => {
    this.props.onReset();
    this.setState({ error: undefined });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }

    return this.props.children;
  }
}

export function QueryBoundary({
  children,
  pendingFallback,
  errorFallback,
}: QueryBoundaryProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!isHydrated) {
    return pendingFallback;
  }

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary fallback={errorFallback} onReset={reset}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

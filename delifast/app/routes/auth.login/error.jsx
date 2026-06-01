import { useRouteError, isRouteErrorResponse } from "@remix-run/react";

export default function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Authentication Error</h1>
        <p>Status: {error.status}</p>
        <p>{error.data || error.statusText}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Unexpected Error</h1>
      <pre>{error?.message || String(error)}</pre>
    </div>
  );
}

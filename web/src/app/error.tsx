"use client";
export default function Error({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h-display mt-3 text-3xl">We hit an unexpected error</h1>
      <p className="mt-3 max-w-md text-sm text-silver-400">{error.digest ? `Reference: ${error.digest}` : "Please try again."}</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </main>
  );
}

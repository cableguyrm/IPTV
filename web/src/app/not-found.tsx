import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="h-display mt-3 text-5xl"><span className="metal">Signal lost</span></h1>
      <p className="mt-4 text-silver-400">The page you were looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="btn-primary mt-8">Back to home</Link>
    </main>
  );
}

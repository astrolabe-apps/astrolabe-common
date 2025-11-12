"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Welcome to __ProjectName__</h1>
        <p className="mb-8">__Description__</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/editor"
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
          >
            <h2 className="text-2xl font-semibold mb-2">Schema Editor →</h2>
            <p className="text-gray-700">
              Edit and manage your form schemas
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

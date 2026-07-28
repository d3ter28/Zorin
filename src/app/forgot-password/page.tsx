"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            Z
          </span>
          Zorin
        </a>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-900">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        <div className="mt-8">
          {submitted ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              If that email exists in our system, we&apos;ve sent a password reset link. Check your inbox.
            </p>
          ) : (
            <AuthForm
              endpoint="/api/auth/forgot-password"
              submitLabel="Send reset link"
              onSuccess={() => setSubmitted(true)}
              fields={[{ name: "email", label: "Email", type: "email", placeholder: "you@store.com" }]}
            />
          )}
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

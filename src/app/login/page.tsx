import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Log in to PriceIQ</h1>
      <AuthForm
        endpoint="/api/auth/login"
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password", type: "password" },
        ]}
      />
      <p className="mt-4 text-sm text-muted">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </main>
  );
}

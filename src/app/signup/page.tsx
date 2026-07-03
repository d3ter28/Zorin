import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Create your PriceIQ account</h1>
      <AuthForm
        endpoint="/api/auth/signup"
        submitLabel="Sign up"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password (8+ characters)", type: "password" },
          { name: "storeName", label: "Store name", type: "text" },
          { name: "storeUrl", label: "Store URL (optional)", type: "url", required: false },
        ]}
      />
      <p className="mt-4 text-sm text-muted">
        Have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}

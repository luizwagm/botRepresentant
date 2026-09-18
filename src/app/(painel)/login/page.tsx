import LoginForm from "./login-form";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-zinc-50 px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

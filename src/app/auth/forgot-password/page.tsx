import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <Link href="/login">
            <button className="text-sm text-muted-foreground hover:text-foreground">
              Back to sign in
            </button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Forgot password</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email and we'll send you instructions to reset your password.
        </p>
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="you@example.com"
            />
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            Send reset instructions
          </button>
        </form>
      </div>
    </div>
  );
}

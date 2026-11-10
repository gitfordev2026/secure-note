import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight">NoteApp</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Your notes, organized.</h1>
        <p className="text-muted-foreground mb-8">
          Secure, private note-taking with admin oversight. Sign up to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </Link>
          <Link href="/login" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-background text-foreground border border-input px-6 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors">
              Sign in
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

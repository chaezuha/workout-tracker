import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntryRow } from "@/components/ui/entry-row";

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = searchParams.get("mode") === "signup";

  const toggleMode = () => {
    setSearchParams(
      { mode: isSignup ? "signin" : "signup" },
      { replace: true },
    );
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const action = isSignup ? signUp : signIn;
    const { data, error } = await action(email, password);

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    if (isSignup && !data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/pwa-192x192.png" alt="" className="size-20 rounded-[22%] shadow-[var(--card-shadow)]" />
        <h1 className="title-1">
          {isSignup ? "Create Account" : "Sign In"}
        </h1>
        <p className="text-muted-foreground">
          {isSignup
            ? "Sync your workouts across devices."
            : "Welcome back to Workout Tracker."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="boxed-list">
          <EntryRow label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </EntryRow>
          <EntryRow label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </EntryRow>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}

        <Button type="submit" size="pill" disabled={submitting} className="mx-auto min-w-48">
          {submitting ? <Spinner className="animate-spin" aria-label="Working" /> : isSignup ? "Sign Up" : "Sign In"}
        </Button>
      </form>

      <div className="grid justify-items-center gap-1 text-sm">
        <Button type="button" variant="ghost" className="text-accent-text" onClick={toggleMode}>
          {isSignup
            ? "Already have an account? Sign In"
            : "New here? Create an Account"}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Continue as Guest</Link>
        </Button>
      </div>
    </div>
  );
}

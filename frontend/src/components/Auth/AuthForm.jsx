import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="mx-auto max-w-sm p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        {isSignup ? "Create an account" : "Sign in"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "…" : isSignup ? "Sign up" : "Sign in"}
        </Button>
      </form>

      <Button type="button" variant="link" className="w-full" onClick={toggleMode}>
        {isSignup
          ? "Already have an account? Sign in"
          : "Need an account? Sign up"}
      </Button>

      <Separator />

      <Button asChild variant="ghost" className="w-full">
        <Link to="/">← Back to guest session</Link>
      </Button>
    </div>
  );
}

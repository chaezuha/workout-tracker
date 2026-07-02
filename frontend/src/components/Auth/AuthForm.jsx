import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AuthForm({ initialMode = "signin" }) {
  const { signIn, signUp, continueAsGuest, authScreen, cancelAuthScreen } =
    useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

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

      <Button
        type="button"
        variant="link"
        className="w-full"
        onClick={() => {
          setMode(isSignup ? "signin" : "signup");
          setError("");
          setMessage("");
        }}
      >
        {isSignup
          ? "Already have an account? Sign in"
          : "Need an account? Sign up"}
      </Button>

      <Separator />

      {authScreen ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={cancelAuthScreen}
        >
          ← Back to guest session
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={continueAsGuest}
          >
            Continue as guest
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Your data stays on this device.
          </p>
        </div>
      )}
    </div>
  );
}

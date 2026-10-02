import { LineupStage } from "@/components/chetak/LineupStage";
import { ChetakLogo, CHETAK_ROUNDEL } from "@/components/chetak/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { DEMO_SESSION } from "@/lib/chetak/data";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

const DEMO_ACCOUNT = {
  email: DEMO_SESSION.email,
  password: DEMO_SESSION.password,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DOT_GRID = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
  backgroundSize: "24px 24px",
};

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmed = email.trim();

  if (!trimmed) {
    errors.email = "Enter your work email address.";
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "That address is missing something — check the format.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (password.length < 6) {
    errors.password = "Passwords are at least 6 characters.";
  }

  return errors;
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label-eyebrow">
          {label}
        </label>
        {hint && !error ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? (
        <p role="alert" className="mt-2 text-[12px] font-medium text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [email, setEmail] = useState(DEMO_ACCOUNT.email);
  const [password, setPassword] = useState(DEMO_ACCOUNT.password);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
    { email: false, password: false },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const errors = useMemo(() => validate(email, password), [email, password]);
  const isEmailInvalid = Boolean(errors.email) && (touched.email || submitted);
  const isPasswordInvalid =
    Boolean(errors.password) && (touched.password || submitted);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const fillDemoAccount = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setTouched({ email: false, password: false });
    setSubmitted(false);
    setError(null);
    setNotice("Demo credentials restored.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setNotice(null);

    if (errors.email || errors.password) {
      setError("Fix the highlighted fields before signing in.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // The demo workspace authenticates every valid sign-in as the shared
      // sample session, which is the queue owned by DEMO_SESSION.executive.
      await signIn("anonymous");
      navigate(redirect, { replace: true });
    } catch (signInError) {
      console.error("Sign-in error:", signInError);
      setError(
        signInError instanceof Error
          ? `Could not sign you in: ${signInError.message}`
          : "Could not sign you in. Please try again.",
      );
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    /* One screen on desktop: the shell never scrolls, the form column does. */
    <div className="grid min-h-screen lg:h-screen lg:overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel ---------------------------------------------------- */}
      {/*
        60/30/10 on the brand panel:
          60% — the quiet indigo field (gradient, dot grid, copy at low contrast)
          30% — the brand mass: the product, its stage and the nameplate
          10% — one aqua accent, the active model on the lineup rail
        The stage is the single isolated element: elevated surface, largest
        scale, the only heavy shadow. Everything else stays hairline-quiet.
      */}
      <aside className="relative hidden flex-col overflow-hidden bg-brand px-11 py-8 text-ivory lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#221d43] via-brand to-[#3b3366]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={DOT_GRID}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[30rem] rounded-full bg-aqua/15 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-28 size-[28rem] rounded-full bg-teal/15 blur-[120px]"
        />

        <header className="relative flex items-center gap-4">
          <img
            src={CHETAK_ROUNDEL}
            alt="Chetak"
            className="size-12 select-none object-contain"
          />
          <span className="h-9 w-px bg-white/15" />
          <span className="grid leading-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ivory/45">
              Chetak Service
            </span>
            <span className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-ivory">
              Ticket Executive
            </span>
          </span>
        </header>

        {/* Panel copy stays terse on purpose: every line it gives up goes to the
            stage, which is what makes the vehicle read large. */}
        <div className="relative mt-7 max-w-lg">
          <h1 className="text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.035em] text-ivory text-balance">
            Your service day,
            <br />
            at a glance.
          </h1>
          {/* Dropped on short viewports: below ~745px the panel runs out of the
              height the cap needs, so the copy yields to keep the vehicle big. */}
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ivory/65 [@media(max-height:745px)]:hidden">
            Every open ticket, the SLA clock and the customer conversation — one
            calm queue.
          </p>
        </div>

        {/* The rotating lineup: the wide model cutouts carry more visual mass
            than the tall hero shot at this panel height, and keep the rail.
            The hero mode is still used on the 404, where the box is taller. */}
        <LineupStage className="mt-6 flex-1" />

        <p className="relative mt-4 text-[11px] text-ivory/35">
          Demonstration workspace · fictional service data
        </p>
      </aside>

      {/* Sign-in panel -------------------------------------------------- */}
      {/*
        Same 60/30/10 on the light side:
          60% — ivory canvas, white card, muted metadata
          30% — brand indigo: the sign-in action and the focus rings
          10% — one aqua accent: the live dot on the demo row
        The form card is the isolated element, mirroring the product stage.
      */}
      <main className="flex items-center justify-center bg-background px-5 py-10 sm:px-10 lg:h-screen lg:overflow-y-auto lg:py-8">
        <div className="w-full max-w-[26rem]">
          <div className="lg:hidden">
            <ChetakLogo className="w-44" />
          </div>

          <div className="mt-9 lg:mt-0">
            <p className="label-eyebrow">Sign in</p>
            <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-ink">
              Welcome back, {DEMO_SESSION.executive.name.split(" ")[0]}.
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Sign in to pick up your queue at {DEMO_SESSION.dealer}.
            </p>
          </div>

          <div className="mt-6 rounded-[28px] border border-border bg-card p-6 shadow-[0_40px_80px_-56px_rgba(30,24,57,0.5)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="label-eyebrow flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-aqua" />
                Demo access
              </p>
              <button
                type="button"
                onClick={fillDemoAccount}
                aria-label="Reset demo credentials"
                className="text-[11px] font-semibold text-brand underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                Reset
              </button>
            </div>

            <dl className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-mono text-[11.5px] text-ink">
                  {DEMO_ACCOUNT.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Password</dt>
                <dd className="font-mono text-[11.5px] text-ink">
                  {DEMO_ACCOUNT.password}
                </dd>
              </div>
            </dl>

            <div className="my-5 h-px bg-border" />

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Field
                label="Work email"
                htmlFor="email"
                error={isEmailInvalid ? errors.email : undefined}
              >
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                      setNotice(null);
                    }}
                    onBlur={() =>
                      setTouched((current) => ({ ...current, email: true }))
                    }
                    aria-invalid={isEmailInvalid}
                    disabled={submitting}
                    className={cn(
                      "h-11 rounded-xl border-border bg-ivory pl-10 text-[14px] shadow-none transition-colors focus-visible:bg-card focus-visible:ring-4",
                      isEmailInvalid
                        ? "border-critical/50 focus-visible:border-critical/60 focus-visible:ring-critical/10"
                        : "focus-visible:border-brand/30 focus-visible:ring-brand/10",
                    )}
                  />
                </div>
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                hint="At least 6 characters"
                error={isPasswordInvalid ? errors.password : undefined}
              >
                <div className="relative flex items-center">
                  <Lock className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                      setNotice(null);
                    }}
                    onBlur={() =>
                      setTouched((current) => ({ ...current, password: true }))
                    }
                    aria-invalid={isPasswordInvalid}
                    disabled={submitting}
                    className={cn(
                      "h-11 rounded-xl border-border bg-ivory pr-11 pl-10 text-[14px] shadow-none transition-colors focus-visible:bg-card focus-visible:ring-4",
                      isPasswordInvalid
                        ? "border-critical/50 focus-visible:border-critical/60 focus-visible:ring-critical/10"
                        : "focus-visible:border-brand/30 focus-visible:ring-brand/10",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </Field>

              {error ? (
                <p role="alert" className="text-[13px] font-medium text-critical">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full bg-brand text-[15px] font-semibold shadow-[0_18px_34px_-20px_rgba(50,43,84,0.75)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Password resets are disabled in this demonstration workspace — use the pre-filled demo details.",
                )
              }
              className="text-[12px] font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Forgot password?
            </button>
            <span className="text-[11px] text-muted-foreground">
              Signing in as {DEMO_SESSION.executive.code}
            </span>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {notice ??
              "Signing in opens the shared sample workspace with pre-loaded service tickets for four dealers."}
          </p>

          {/* Phones skip the brand panel, so the lineup gets a compact strip. */}
          <LineupStage tone="light" compact className="mt-8 h-56 lg:hidden" />
        </div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}

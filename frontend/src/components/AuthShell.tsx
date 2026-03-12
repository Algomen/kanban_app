"use client";

import { FormEvent, useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";

const AUTH_STORAGE_KEY = "pm-authenticated";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

const LoginForm = ({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (username: string, password: string) => boolean;
  errorMessage: string | null;
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const didAuthenticate = onSubmit(username, password);

    if (!didAuthenticate) {
      setPassword("");
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <section className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Project Management MVP
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[var(--navy-dark)]">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Use the MVP credentials to access the board.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              Username
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="username"
              aria-label="Username"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="current-password"
              aria-label="Password"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-[rgba(117,57,145,0.18)] bg-[rgba(117,57,145,0.08)] px-4 py-3 text-sm text-[var(--secondary-purple)]">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--gray-text)]">
          Demo credentials: <strong className="text-[var(--navy-dark)]">user</strong> /{" "}
          <strong className="text-[var(--navy-dark)]">password</strong>
        </div>
      </section>
    </main>
  );
};

export const AuthShell = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(AUTH_STORAGE_KEY) === "true");
    setIsHydrated(true);
  }, []);

  const handleLogin = (username: string, password: string) => {
    const isValid =
      username.trim() === VALID_USERNAME && password === VALID_PASSWORD;

    if (!isValid) {
      setErrorMessage("Use the demo credentials: user / password.");
      return false;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setErrorMessage(null);
    setIsAuthenticated(true);
    return true;
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setErrorMessage(null);
    setIsAuthenticated(false);
  };

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginForm onSubmit={handleLogin} errorMessage={errorMessage} />;
  }

  return <KanbanBoard onLogout={handleLogout} />;
};

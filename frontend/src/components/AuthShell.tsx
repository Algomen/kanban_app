"use client";

import { FormEvent, useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { type BoardData } from "@/lib/kanban";

const AUTH_STORAGE_KEY = "pm-authenticated";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIResponse = {
  assistantMessage: string;
  board: BoardData | null;
};

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
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [boardErrorMessage, setBoardErrorMessage] = useState<string | null>(null);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  const loadBoard = async () => {
    setIsBoardLoading(true);
    setBoardErrorMessage(null);

    try {
      const response = await fetch("/api/board");
      if (!response.ok) {
        throw new Error("Unable to load board.");
      }

      const nextBoard = (await response.json()) as BoardData;
      setBoard(nextBoard);
    } catch {
      setBoardErrorMessage("Unable to load board.");
    } finally {
      setIsBoardLoading(false);
    }
  };

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(AUTH_STORAGE_KEY) === "true");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    void loadBoard();
  }, [isAuthenticated, isHydrated]);

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
    setBoard(null);
    setBoardErrorMessage(null);
    setIsSavingBoard(false);
    setChatMessages([]);
    setIsAiLoading(false);
    setAiErrorMessage(null);
    setIsAuthenticated(false);
  };

  const handleBoardChange = async (nextBoard: BoardData) => {
    setBoard(nextBoard);
    setIsSavingBoard(true);
    setBoardErrorMessage(null);

    try {
      const response = await fetch("/api/board", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextBoard),
      });

      if (!response.ok) {
        throw new Error("Unable to save board.");
      }

      const persistedBoard = (await response.json()) as BoardData;
      setBoard(persistedBoard);
    } catch {
      setBoardErrorMessage("Unable to save changes.");
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleAiSubmit = async (message: string) => {
    if (!board) {
      return;
    }

    const nextHistory = [...chatMessages, { role: "user" as const, content: message }];
    setChatMessages(nextHistory);
    setIsAiLoading(true);
    setAiErrorMessage(null);

    try {
      const response = await fetch("/api/ai/board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          board,
          message,
          history: chatMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to reach the AI assistant.");
      }

      const aiResponse = (await response.json()) as AIResponse;
      setChatMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: aiResponse.assistantMessage },
      ]);
      if (aiResponse.board) {
        setBoard(aiResponse.board);
      }
    } catch {
      setAiErrorMessage("Unable to reach the AI assistant.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginForm onSubmit={handleLogin} errorMessage={errorMessage} />;
  }

  if (isBoardLoading || !board) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-6 py-12">
        <section className="rounded-[32px] border border-[var(--stroke)] bg-white/85 px-8 py-10 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Project Management MVP
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Loading board
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
            {boardErrorMessage ?? "Fetching your latest board state from the backend."}
          </p>
          {boardErrorMessage ? (
            <button
              type="button"
              onClick={() => {
                void loadBoard();
              }}
              className="mt-6 rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:brightness-110"
            >
              Retry
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <KanbanBoard
      initialBoard={board}
      onBoardChange={(nextBoard) => {
        void handleBoardChange(nextBoard);
      }}
      isSaving={isSavingBoard}
      saveError={boardErrorMessage}
      chatMessages={chatMessages}
      isAiLoading={isAiLoading}
      aiError={aiErrorMessage}
      onAiSubmit={(message) => {
        void handleAiSubmit(message);
      }}
      onLogout={handleLogout}
    />
  );
};

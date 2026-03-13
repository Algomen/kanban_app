"use client";

import { FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanCardOverlay } from "@/components/KanbanCard";
import { KanbanColumn } from "@/components/KanbanColumn";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";

const findColumnId = (board: BoardData, itemId: string) => {
  if (board.columns.some((column) => column.id === itemId)) {
    return itemId;
  }

  return board.columns.find((column) => column.cardIds.includes(itemId))?.id;
};

const ChatInput = memo(function ChatInput({
  onSubmit,
  isLoading = false,
}: {
  onSubmit?: (message: string) => void;
  isLoading?: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = value.trim();
    if (!message || !onSubmit || isLoading) return;
    setValue("");
    onSubmit(message);
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="sr-only">Message the AI assistant</span>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-28 w-full rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm leading-6 text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          placeholder="Ask the AI to update the board..."
          aria-label="Message the AI assistant"
        />
      </label>
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="w-full rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
    </form>
  );
});

export const KanbanBoard = ({
  onLogout,
  initialBoard = initialData,
  onBoardChange,
  isSaving = false,
  saveError = null,
  chatMessages = [],
  isAiLoading = false,
  aiError = null,
  onAiSubmit,
}: {
  onLogout?: () => void;
  initialBoard?: BoardData;
  onBoardChange?: (board: BoardData) => void;
  isSaving?: boolean;
  saveError?: string | null;
  chatMessages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  isAiLoading?: boolean;
  aiError?: string | null;
  onAiSubmit?: (message: string) => void;
}) => {
  const [board, setBoard] = useState<BoardData>(() => initialBoard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  // Holds the board reference that should not be persisted (set when a parent-driven
  // update syncs initialBoard into local state). Using a reference comparison rather
  // than a boolean avoids a race where a user drag that is batched with an AI update
  // would be incorrectly skipped.
  const skipBoardRef = useRef<BoardData | null>(initialBoard);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  useEffect(() => {
    skipBoardRef.current = initialBoard;
    setBoard(initialBoard);
  }, [initialBoard]);

  useEffect(() => {
    if (!onBoardChange) {
      return;
    }

    if (skipBoardRef.current === board) {
      skipBoardRef.current = null;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onBoardChange(board);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [board, onBoardChange]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setBoard((prev) => {
      const activeColumnId = findColumnId(prev, active.id as string);
      const overColumnId = findColumnId(prev, over.id as string);

      if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
        return prev;
      }

      return {
        ...prev,
        columns: moveCard(prev.columns, active.id as string, over.id as string),
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => {
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                One board. Five columns. Zero clutter.
              </p>
            </div>
          </div>
          {onLogout ? (
            <div className="flex justify-end">
              <div className="flex items-center gap-3">
                {saveError ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--secondary-purple)]">
                    {saveError}
                  </p>
                ) : isSaving ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
                    Saving...
                  </p>
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
                    Saved
                  </p>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--navy-dark)]"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <section className="grid gap-6 lg:grid-cols-5">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
            <DragOverlay>
              {activeCard ? (
                <div className="w-full max-w-[280px]">
                  <KanbanCardOverlay card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <aside className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
              AI Assistant
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-[var(--navy-dark)]">
              Board chat
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
              Ask the assistant to summarize, create, edit, or move cards across the fixed columns.
            </p>

            <div className="mt-6 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-[28px] border border-[var(--stroke)] bg-[var(--surface)] p-4">
              {chatMessages.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--gray-text)]">
                  No messages yet. Try "Move Align roadmap themes to Review."
                </p>
              ) : (
                chatMessages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-[24px] bg-[var(--secondary-purple)] px-4 py-3 text-sm text-white"
                        : "mr-8 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)]"
                    }
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap leading-6">{message.content}</p>
                  </article>
                ))
              )}
              {isAiLoading ? (
                <p className="mr-8 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--gray-text)]">
                  Thinking...
                </p>
              ) : null}
            </div>

            {aiError ? (
              <p className="mt-4 rounded-2xl border border-[rgba(117,57,145,0.18)] bg-[rgba(117,57,145,0.08)] px-4 py-3 text-sm text-[var(--secondary-purple)]">
                {aiError}
              </p>
            ) : null}

            <ChatInput onSubmit={onAiSubmit} isLoading={isAiLoading} />
          </aside>
        </div>
      </main>
    </div>
  );
};

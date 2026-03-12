import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

type KanbanCardShellProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  className?: string;
  style?: CSSProperties;
  dragAttributes?: ReturnType<typeof useSortable>["attributes"];
  dragListeners?: ReturnType<typeof useSortable>["listeners"];
  setNodeRef?: ReturnType<typeof useSortable>["setNodeRef"];
};

const KanbanCardShell = ({
  card,
  onDelete,
  className,
  style,
  dragAttributes,
  dragListeners,
  setNodeRef,
}: KanbanCardShellProps) => (
  <article
    ref={setNodeRef}
    style={style}
    className={className}
    {...dragAttributes}
    {...dragListeners}
    data-testid={`card-${card.id}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
          {card.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
          {card.details}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(card.id)}
        className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
        aria-label={`Delete ${card.title}`}
      >
        Remove
      </button>
    </div>
  </article>
);

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <KanbanCardShell
      card={card}
      onDelete={onDelete}
      setNodeRef={setNodeRef}
      style={style}
      className={clsx(
        "cursor-grab rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)] active:cursor-grabbing",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  );
};

export const KanbanCardOverlay = ({ card }: { card: Card }) => (
  <KanbanCardShell
    card={card}
    onDelete={() => {}}
    className="cursor-grab rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_18px_32px_rgba(3,33,71,0.16)] rotate-1"
  />
);

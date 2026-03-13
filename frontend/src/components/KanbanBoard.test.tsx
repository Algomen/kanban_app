import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { cloneBoardData, initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns", () => {
    render(<KanbanBoard />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("keeps the empty column drop hint visible after its last card is removed", async () => {
    render(<KanbanBoard />);
    const reviewColumn = screen.getByTestId("column-col-review");

    await userEvent.click(
      within(reviewColumn).getByRole("button", { name: /delete qa micro-interactions/i })
    );

    expect(within(reviewColumn).getByText("Drop a card here")).toBeInTheDocument();
  });

  it("loads a saved board from localStorage", () => {
    const storedBoard = cloneBoardData(initialData);
    storedBoard.columns[0] = {
      ...storedBoard.columns[0],
      title: "Saved Backlog",
    };

    render(<KanbanBoard initialBoard={storedBoard} />);

    expect(screen.getByDisplayValue("Saved Backlog")).toBeInTheDocument();
  });

  it("does not call onBoardChange when initialBoard prop is replaced by parent", async () => {
    // Verifies the race-condition fix: when the parent updates initialBoard (e.g. after
    // an AI response), the local board sync must NOT trigger a persist callback.
    const onBoardChange = vi.fn();
    const board1 = cloneBoardData(initialData);
    const board2 = cloneBoardData(initialData);
    board2.columns[0] = { ...board2.columns[0], title: "AI Updated" };

    const { rerender } = render(
      <KanbanBoard initialBoard={board1} onBoardChange={onBoardChange} />
    );

    rerender(<KanbanBoard initialBoard={board2} onBoardChange={onBoardChange} />);

    // Wait longer than the 250ms debounce to be sure no save fires
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it("renders AI chat messages and submits prompts", async () => {
    const onAiSubmit = vi.fn();
    render(
      <KanbanBoard
        chatMessages={[
          { role: "user", content: "Move a card." },
          { role: "assistant", content: "Moved it." },
        ]}
        onAiSubmit={onAiSubmit}
      />
    );

    expect(screen.getByText("Move a card.")).toBeInTheDocument();
    expect(screen.getByText("Moved it.")).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("Message the AI assistant"),
      "Create a card"
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onAiSubmit).toHaveBeenCalledWith("Create a card");
  });
});

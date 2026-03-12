import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthShell } from "@/components/AuthShell";
import { cloneBoardData, initialData } from "@/lib/kanban";

const storage = new Map<string, string>();
const fetchMock = vi.fn();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "fetch", {
  value: fetchMock,
  configurable: true,
});

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("AuthShell", () => {
  beforeEach(() => {
    storage.clear();
    fetchMock.mockReset();
  });

  it("shows the login form when unauthenticated", () => {
    render(<AuthShell />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Kanban Studio" })).not.toBeInTheDocument();
  });

  it("rejects invalid credentials", async () => {
    render(<AuthShell />);

    await signIn("wrong", "creds");

    expect(
      screen.getByText("Use the demo credentials: user / password.")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("logs in with the demo credentials", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => cloneBoardData(initialData),
    });

    render(<AuthShell />);

    await signIn("user", "password");

    expect(screen.getByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
    expect(window.localStorage.getItem("pm-authenticated")).toBe("true");
  });

  it("logs out and returns to the login screen", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => cloneBoardData(initialData),
    });

    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(window.localStorage.getItem("pm-authenticated")).toBeNull();
  });

  it("reloads the saved board from the backend after logout and login", async () => {
    const savedBoard = cloneBoardData(initialData);
    savedBoard.columns[0] = {
      ...savedBoard.columns[0],
      title: "Saved Backlog",
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => savedBoard,
    });

    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await signIn("user", "password");

    expect(screen.getByDisplayValue("Saved Backlog")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a retry state when the board load fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(<AuthShell />);

    await signIn("user", "password");

    expect(screen.getByRole("heading", { name: "Loading board" })).toBeInTheDocument();
    expect(screen.getByText("Unable to load board.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows AI responses without changing the board when the response is message-only", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cloneBoardData(initialData),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage: "The board looks balanced.",
          board: null,
        }),
      });

    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.type(
      screen.getByLabelText("Message the AI assistant"),
      "Summarize the board"
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("The board looks balanced.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Backlog")).toBeInTheDocument();
  });

  it("applies AI board updates automatically", async () => {
    const updatedBoard = cloneBoardData(initialData);
    updatedBoard.columns[3] = {
      ...updatedBoard.columns[3],
      cardIds: ["card-6", "card-1"],
    };
    updatedBoard.columns[0] = {
      ...updatedBoard.columns[0],
      cardIds: ["card-2"],
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cloneBoardData(initialData),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage: "Moved the card to Review.",
          board: updatedBoard,
        }),
      });

    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.type(
      screen.getByLabelText("Message the AI assistant"),
      "Move Align roadmap themes to Review"
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Moved the card to Review.")).toBeInTheDocument();
    expect(screen.getByTestId("column-col-review")).toHaveTextContent(
      "Align roadmap themes"
    );
  });
});

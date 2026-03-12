import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthShell } from "@/components/AuthShell";

const storage = new Map<string, string>();

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

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("AuthShell", () => {
  beforeEach(() => {
    storage.clear();
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
    render(<AuthShell />);

    await signIn("user", "password");

    expect(screen.getByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
    expect(window.localStorage.getItem("pm-authenticated")).toBe("true");
  });

  it("logs out and returns to the login screen", async () => {
    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(window.localStorage.getItem("pm-authenticated")).toBeNull();
  });

  it("keeps the board state after logout and login", async () => {
    window.localStorage.setItem(
      "pm-board-user",
      JSON.stringify({
        columns: [
          { id: "col-backlog", title: "Saved Backlog", cardIds: [] },
          { id: "col-discovery", title: "Discovery", cardIds: [] },
          { id: "col-progress", title: "In Progress", cardIds: [] },
          { id: "col-review", title: "Review", cardIds: [] },
          { id: "col-done", title: "Done", cardIds: [] },
        ],
        cards: {},
      })
    );

    render(<AuthShell />);

    await signIn("user", "password");
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await signIn("user", "password");

    expect(screen.getByDisplayValue("Saved Backlog")).toBeInTheDocument();
  });
});

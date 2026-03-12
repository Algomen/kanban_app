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
});

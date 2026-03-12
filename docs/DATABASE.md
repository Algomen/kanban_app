# Database Proposal

This document defines the proposed database model for the Project Management MVP.

Scope:
- SQLite only
- One board per signed-in user for MVP
- Board state stored as JSON
- Design should support multiple users later without restructuring the whole app

## Recommendation

Use two tables:
- `users`
- `boards`

Keep the board payload as JSON in `boards.board_json`.

This is the simplest design that still preserves the right ownership boundary:
- users are separate records
- each board belongs to exactly one user
- board structure stays aligned with the existing frontend `BoardData` shape

## Proposed schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  board_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Recommended index:

```sql
CREATE UNIQUE INDEX idx_boards_user_id ON boards(user_id);
```

Notes:
- `users.username` is unique because future multi-user support will need a stable lookup key
- `boards.user_id` is unique because MVP requires one board per user
- `board_json` stores the full board document as a JSON string
- timestamps are stored as UTC ISO-like text via SQLite defaults and application updates

## Stored board shape

`board_json` should store the same shape already used in the frontend:

```json
{
  "columns": [
    {
      "id": "col-backlog",
      "title": "Backlog",
      "cardIds": ["card-1", "card-2"]
    }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Align roadmap themes",
      "details": "Draft quarterly themes with impact statements and metrics."
    }
  }
}
```

Why keep this shape:
- it matches the current frontend state model exactly
- it avoids translation logic in the backend for the MVP
- it makes read/write operations straightforward

## Default data strategy

For the MVP user:
- create the `users` record for `user` if it does not exist
- create the board row if it does not exist
- seed `board_json` with the current default board data on first creation only

This means:
- first login gets a usable starter board
- later edits overwrite the stored JSON
- future app restarts keep the board unchanged

## Backend behavior proposal

When the backend starts or when the first authenticated board request is made:

1. Ensure the SQLite database file exists.
2. Ensure required tables exist.
3. Ensure the MVP user row exists for username `user`.
4. Ensure that user has a board row.
5. If no board exists yet, insert one using the default board JSON.

This keeps setup simple and avoids a separate migration/bootstrap flow for the MVP.

## Why not normalize cards and columns now

A more normalized schema could use:
- `boards`
- `columns`
- `cards`
- ordering fields and foreign keys

That is not the right tradeoff yet because:
- the current UI already works with one JSON board document
- the MVP only needs one board per user
- normalized ordering and drag/drop persistence adds complexity without current benefit
- AI updates later will likely operate on whole-board JSON anyway

We can normalize later if reporting, querying, or collaboration requirements justify it.

## Validation rules

Before saving `board_json`, the backend should validate:
- top-level keys are `columns` and `cards`
- every column has `id`, `title`, and `cardIds`
- every card has `id`, `title`, and `details`
- every `cardId` referenced by a column exists in `cards`
- no card is referenced by more than one column

This is application validation, not SQL-level validation.

## Expected access pattern

Primary read path:
- fetch board by username

Primary write path:
- replace the full `board_json` document for the user

This is acceptable for the MVP because:
- board size is small
- there is only one board per user
- update frequency is low
- full-document replacement is simpler and less error-prone than partial SQL updates

## Future-compatible extension points

This design leaves room for later changes:
- multiple boards per user by removing the unique constraint on `boards.user_id`
- named boards by adding `boards.name`
- optimistic concurrency by adding a `version` column
- audit history by adding a `board_events` table
- structured AI chat history by adding a separate `chat_messages` table

None of those are needed for the MVP.

## Decision summary

Recommended MVP database design:
- SQLite database file created automatically if missing
- `users` table with unique usernames
- `boards` table with one row per user
- full board stored as JSON text
- default board seeded once for the MVP user

This is the simplest design that matches the current frontend and supports the next implementation steps without unnecessary modeling overhead.

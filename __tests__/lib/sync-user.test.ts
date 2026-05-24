import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @clerk/nextjs/server before importing the module under test
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// Mock @/db to avoid real database calls
vi.mock("@/db", () => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    db: { insert },
    users: { email: "email_column_ref" },
  };
});

import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { syncCurrentUserEmail } from "@/lib/sync-user";

// Helper to get nested mock chain from db.insert
function getInsertChain() {
  const insertMock = vi.mocked(db.insert);
  const valuesMock = insertMock.mock.results[0]?.value?.values as ReturnType<typeof vi.fn>;
  const conflictMock = valuesMock?.mock.results[0]?.value?.onConflictDoUpdate as ReturnType<typeof vi.fn>;
  return { insertMock, valuesMock, conflictMock };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Re-setup the mock chain after clearAllMocks
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  vi.mocked(db.insert).mockReturnValue({ values } as any);
});

// ---------------------------------------------------------------------------
// Early-return cases
// ---------------------------------------------------------------------------

describe("syncCurrentUserEmail – no-op cases", () => {
  it("returns without hitting the database when there is no authenticated user", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await syncCurrentUserEmail();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns without hitting the database when the user has no email addresses", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_123",
      primaryEmailAddress: null,
      emailAddresses: [],
      firstName: "John",
      lastName: "Doe",
      username: null,
    } as any);

    await syncCurrentUserEmail();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns without hitting the database when primaryEmailAddress is undefined and emailAddresses is empty", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_456",
      primaryEmailAddress: undefined,
      emailAddresses: [],
      firstName: null,
      lastName: null,
      username: "johndoe",
    } as any);

    await syncCurrentUserEmail();

    expect(db.insert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Email resolution
// ---------------------------------------------------------------------------

describe("syncCurrentUserEmail – email resolution", () => {
  it("uses primaryEmailAddress.emailAddress when it is present", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_primary",
      primaryEmailAddress: { emailAddress: "primary@example.com" },
      emailAddresses: [
        { emailAddress: "fallback@example.com" },
      ],
      firstName: "Alice",
      lastName: null,
      username: null,
    } as any);

    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "primary@example.com" })
    );
  });

  it("falls back to emailAddresses[0] when primaryEmailAddress is null", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_fallback",
      primaryEmailAddress: null,
      emailAddresses: [
        { emailAddress: "first@example.com" },
        { emailAddress: "second@example.com" },
      ],
      firstName: "Bob",
      lastName: null,
      username: null,
    } as any);

    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "first@example.com" })
    );
  });

  it("falls back to emailAddresses[0] when primaryEmailAddress.emailAddress is undefined", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_no_primary_addr",
      primaryEmailAddress: { emailAddress: undefined },
      emailAddresses: [{ emailAddress: "only@example.com" }],
      firstName: null,
      lastName: null,
      username: null,
    } as any);

    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "only@example.com" })
    );
  });
});

// ---------------------------------------------------------------------------
// Name construction
// ---------------------------------------------------------------------------

describe("syncCurrentUserEmail – name construction", () => {
  async function callWithNameParts(parts: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  }) {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_name",
      primaryEmailAddress: { emailAddress: "name@example.com" },
      emailAddresses: [],
      firstName: parts.firstName ?? null,
      lastName: parts.lastName ?? null,
      username: parts.username ?? null,
    } as any);

    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    return insertMock.mock.results[0].value.values.mock.calls[0][0];
  }

  it("joins firstName and lastName with a space", async () => {
    const values = await callWithNameParts({ firstName: "Jane", lastName: "Doe" });
    expect(values.name).toBe("Jane Doe");
  });

  it("uses firstName alone when lastName is null", async () => {
    const values = await callWithNameParts({ firstName: "Jane", lastName: null });
    expect(values.name).toBe("Jane");
  });

  it("uses lastName alone when firstName is null", async () => {
    const values = await callWithNameParts({ firstName: null, lastName: "Doe" });
    expect(values.name).toBe("Doe");
  });

  it("falls back to username when both firstName and lastName are null", async () => {
    const values = await callWithNameParts({ firstName: null, lastName: null, username: "janedoe" });
    expect(values.name).toBe("janedoe");
  });

  it("sets name to null when firstName, lastName, and username are all null", async () => {
    const values = await callWithNameParts({ firstName: null, lastName: null, username: null });
    expect(values.name).toBeNull();
  });

  it("does not include empty string firstName in the joined name", async () => {
    const values = await callWithNameParts({ firstName: "", lastName: "Smith" });
    // filter(Boolean) removes empty string, so only "Smith" should remain
    expect(values.name).toBe("Smith");
  });
});

// ---------------------------------------------------------------------------
// Database write behavior
// ---------------------------------------------------------------------------

describe("syncCurrentUserEmail – database interaction", () => {
  const mockUser = {
    id: "clerk_abc",
    primaryEmailAddress: { emailAddress: "db@example.com" },
    emailAddresses: [],
    firstName: "Test",
    lastName: "User",
    username: null,
  };

  beforeEach(() => {
    vi.mocked(currentUser).mockResolvedValue(mockUser as any);
  });

  it("calls db.insert with the users table", async () => {
    await syncCurrentUserEmail();
    expect(db.insert).toHaveBeenCalledWith(users);
  });

  it("inserts the correct clerkId, email, and name values", async () => {
    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    expect(valuesMock).toHaveBeenCalledWith({
      clerkId: "clerk_abc",
      email: "db@example.com",
      name: "Test User",
    });
  });

  it("calls onConflictDoUpdate targeting the email column", async () => {
    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    const conflictMock = valuesMock.mock.results[0].value.onConflictDoUpdate;

    expect(conflictMock).toHaveBeenCalledWith(
      expect.objectContaining({ target: users.email })
    );
  });

  it("includes clerkId, email, name, and updatedAt in the conflict update set", async () => {
    await syncCurrentUserEmail();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    const conflictMock = valuesMock.mock.results[0].value.onConflictDoUpdate;
    const callArg = conflictMock.mock.calls[0][0];

    expect(callArg.set).toMatchObject({
      clerkId: "clerk_abc",
      email: "db@example.com",
      name: "Test User",
    });
    expect(callArg.set.updatedAt).toBeInstanceOf(Date);
  });

  it("passes a Date instance for updatedAt in the conflict update set", async () => {
    const before = new Date();
    await syncCurrentUserEmail();
    const after = new Date();

    const insertMock = vi.mocked(db.insert);
    const valuesMock = insertMock.mock.results[0].value.values;
    const conflictMock = valuesMock.mock.results[0].value.onConflictDoUpdate;
    const { set } = conflictMock.mock.calls[0][0];

    expect(set.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(set.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("propagates errors thrown by the database", async () => {
    const dbError = new Error("DB connection failed");
    const failingConflict = vi.fn().mockRejectedValue(dbError);
    const failingValues = vi.fn().mockReturnValue({ onConflictDoUpdate: failingConflict });
    vi.mocked(db.insert).mockReturnValue({ values: failingValues } as any);

    await expect(syncCurrentUserEmail()).rejects.toThrow("DB connection failed");
  });
});
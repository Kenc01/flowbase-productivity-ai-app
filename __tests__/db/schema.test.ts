import { describe, it, expect } from "vitest";
import { users } from "@/db/schema";

/**
 * Tests for the users table schema changes introduced in this PR:
 *  - Added `clerkId` (text, nullable)
 *  - Added `updatedAt` (timestamp, defaultNow, notNull)
 */

describe("users table schema", () => {
  it("has a clerkId column", () => {
    expect(users.clerkId).toBeDefined();
  });

  it("has an updatedAt column", () => {
    expect(users.updatedAt).toBeDefined();
  });

  it("clerkId column maps to the correct SQL column name 'clerk_id'", () => {
    expect(users.clerkId.name).toBe("clerk_id");
  });

  it("updatedAt column maps to the correct SQL column name 'updated_at'", () => {
    expect(users.updatedAt.name).toBe("updated_at");
  });

  it("clerkId column is not marked as notNull (it is nullable)", () => {
    // Drizzle marks required columns with notNull = true in column config
    const columnConfig = (users.clerkId as any).notNull ?? false;
    expect(columnConfig).toBe(false);
  });

  it("updatedAt column is marked as notNull", () => {
    const columnConfig = (users.updatedAt as any).notNull ?? false;
    expect(columnConfig).toBe(true);
  });

  it("has the expected set of columns including the new ones", () => {
    const columnNames = Object.keys(users);
    expect(columnNames).toContain("clerkId");
    expect(columnNames).toContain("updatedAt");
    // Pre-existing columns still present
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("email");
    expect(columnNames).toContain("createdAt");
  });

  it("email column is still marked as notNull and unique", () => {
    const col = users.email as any;
    expect(col.notNull).toBe(true);
    expect(col.isUnique).toBe(true);
  });

  it("updatedAt column has a defaultNow expression", () => {
    // Drizzle stores the default via a hasDefault flag when defaultNow() is used
    const col = users.updatedAt as any;
    expect(col.hasDefault).toBe(true);
  });
});
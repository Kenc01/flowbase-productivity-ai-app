import { currentUser } from "@clerk/nextjs/server";

import { db, users } from "@/db";

export async function syncCurrentUserEmail() {
  const user = await currentUser();

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.at(0)?.emailAddress;

  if (!user || !email) {
    return;
  }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    null;

  await db
    .insert(users)
    .values({
      clerkId: user.id,
      email,
      name,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        clerkId: user.id,
        email,
        name,
        updatedAt: new Date(),
      },
    });
}

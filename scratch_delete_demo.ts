import { eq, or } from "drizzle-orm";
import { getDb } from "./server/db";
import { users } from "./drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error("Could not connect to database");
  }

  const result = await db.delete(users).where(
    or(
      eq(users.username, "demo"),
      eq(users.loginMethod, "demo")
    )
  );
  
  console.log("Deleted demo users:", result);
  process.exit(0);
}

main().catch(console.error);

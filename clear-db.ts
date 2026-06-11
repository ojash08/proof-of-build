import 'dotenv/config';
import { getDb } from './server/db';
import { users, verifiedBuilds, competencies, badges, activityFeed } from './drizzle/schema';

async function clearDatabase() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  console.log("Clearing database...");
  try {
    // Delete in reverse dependency order if foreign keys were strict, 
    // but here we can just delete from all of them.
    await db.delete(activityFeed);
    await db.delete(badges);
    await db.delete(competencies);
    await db.delete(verifiedBuilds);
    await db.delete(users);
    
    console.log("Database cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();

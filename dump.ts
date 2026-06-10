import 'dotenv/config';
import { getDb } from './server/db';
import { users, verifiedBuilds } from './drizzle/schema';
async function run() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    return;
  }
  const allUsers = await db.select().from(users);
  console.log("USERS:", allUsers);
  
  const builds = await db.select().from(verifiedBuilds);
  console.log("BUILDS:", builds.map(b => ({ id: b.id, repo: b.repoName, status: b.status, mock: b.verificationError })));
  
  process.exit(0);
}
run();

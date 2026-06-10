import { getDb, upsertUser, getUserByOpenId } from "./server/db";

async function main() {
  console.log("Upserting user...");
  await upsertUser({
    openId: "test-upsert-1",
    name: "Test User",
    totalXp: 1234,
    currentLevel: 42,
    trustScore: "99.00"
  });
  
  const user = await getUserByOpenId("test-upsert-1");
  console.log("User after upsert:", user);
}

main().catch(console.error);

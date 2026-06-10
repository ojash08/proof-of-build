import { getDb, updateUserProfile, getUserByOpenId } from "./server/db";

async function main() {
  console.log("Updating user profile...");
  const user = await getUserByOpenId("test-upsert-1");
  if (user) {
    await updateUserProfile(user.id, {
      totalXp: 9999,
      currentLevel: 99,
      trustScore: "100.00"
    });
    
    const updatedUser = await getUserByOpenId("test-upsert-1");
    console.log("User after update:", updatedUser);
  } else {
    console.log("User not found");
  }
}

main().catch(console.error);

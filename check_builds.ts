import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import "dotenv/config";
import { verifiedBuilds } from "./drizzle/schema";

async function checkBuilds() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL || "mysql://root@localhost:3307/proof_of_build",
  });
  const db = drizzle(connection);
  const builds = await db.select().from(verifiedBuilds);
  console.log(JSON.stringify(builds, null, 2));
  await connection.end();
}

checkBuilds().catch(console.error);

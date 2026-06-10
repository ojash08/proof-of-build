import "dotenv/config";
import * as db from './server/db';
async function test() {
  try {
    await db.upsertUser({ openId: 'test_clerk', loginMethod: 'clerk' });
    console.log('Success');
  } catch (e) {
    console.error('Error:', e);
  }
}
test().catch(console.error);

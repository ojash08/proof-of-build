import 'dotenv/config';
import { invokeLLM } from './server/_core/llm';

async function run() {
  try {
    const response = await invokeLLM({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "Hi" }]
    });
    console.log("Response:", response.choices[0]?.message?.content);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();

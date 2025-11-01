import readline from "readline";
import { Client, Users, ID, Query } from "node-appwrite";
import { env } from "../src/config/env.js";

const ask = (q: string) =>
  new Promise<string>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });

const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const users = new Users(client);

async function main() {
  const email = await ask("Enter email: ");
  const password = await ask("Enter password: ");
  const name = await ask("Enter name: ");

  try {
    console.log("Creating user...");
    const user = await users.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });
    console.log("User created:", user.$id);

    console.log("Creating JWT...");
    const jwt = await users.createJWT(user.$id);
    console.log("JWT:", jwt.jwt);
  } catch (err: any) {
    if (err?.code === 409) {
      console.log("User already exists. Fetching existing user...");
      const list = await users.list([Query.equal("email", email)]);
      const existingUser = list.users?.[0];
      if (!existingUser) throw new Error("User not found, though email exists");

      console.log("Creating JWT for existing user...");
      const jwt = await users.createJWT(existingUser.$id);
      console.log("JWT:", jwt.jwt);
    } else {
      console.error("Error:", err);
    }
  }
}

main();

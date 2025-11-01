import { Client, Databases, Messaging, Users, Account } from "node-appwrite";
import { env } from "../config/env";
import fp from "fastify-plugin";


const serverClient = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

export const db = new Databases(serverClient);
export const messaging = new Messaging(serverClient);
export const users = new Users(serverClient);


export const makeAccountFromJWT = (jwt: string) => {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setJWT(jwt);

  const account = new Account(client);
  return { account, client };
};

export default fp(async (fastify) => {
  fastify.decorate("db", db);
  fastify.decorate("messaging", messaging);
  fastify.decorate("users", users);
}, { name: "appwrite" });

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
    messaging: typeof messaging;
    users: typeof users;
  }
}

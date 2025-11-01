import { Client, Databases, Messaging, Users, Account } from 'node-appwrite';
import { env } from '../config/env';

const serverClient = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

export const db = new Databases(serverClient);
export const messaging = new Messaging(serverClient);
export const users = new Users(serverClient);

/**
 * Creates an Appwrite Account and Client instance from a JWT
 * 
 * @param jwt - The JWT token string
 * @returns An object containing the Account and Client instances
 */
export const makeAccountFromJWT = (jwt: string) => {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID);
    .setJWT(jwt);

  const account = new Account(client);
  return { account, client };
};
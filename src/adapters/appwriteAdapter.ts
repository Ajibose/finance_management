import type { Databases, Models, Query } from "node-appwrite";
import { env } from "../config/env";
import { Permission, Role, ID } from "node-appwrite";

type Doc<T> = Models.Document & T;
const DB_ID = env.APPWRITE_DATABASE_ID;

/** Combined permissions for a single user */
const permsFor = (userId: string) => ([
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
]);

/** Add timestamps to documents */
const withTimestamps = <T extends object>(data: T, isCreate = true) => ({
  ...(data as object),
  ...(isCreate ? { createdAt: new Date().toISOString() } : {}),
  updatedAt: new Date().toISOString(),
});

export class AppwriteRepo {
  constructor(private readonly db: Databases, private readonly dbId: string = DB_ID) {}

  /** Create a document with owner permissions and timestamps */
  async create<T extends object>(
    collectionId: string,
    userId: string,
    data: T,
    documentId?: string
  ): Promise<Doc<T>> {
    const payload = withTimestamps({ userId, ...(data as object) }, true);
    const perms = permsFor(userId);
    const id = documentId ?? ID.unique();

    return this.db.createDocument(this.dbId, collectionId, id, payload, perms) as unknown as Doc<T>;
  }

  /** Update a document and enforce ownership*/
  async update<T extends object>(
    collectionId: string,
    documentId: string,
    userId: string,
    patch: Partial<T>
  ): Promise<Doc<T>> {
    // Enforce ownership first
    await this.getById<T>(collectionId, documentId, userId);

    const payload = withTimestamps(patch, false);
    const perms = permsFor(userId);

    return this.db.updateDocument(this.dbId, collectionId, documentId, payload, perms) as unknown as Doc<T>;
  }

  /** Get one document by ID and enforce ownership */
  async getById<T>(collectionId: string, documentId: string, userId: string): Promise<Doc<T>> {
    const doc = (await this.db.getDocument(this.dbId, collectionId, documentId)) as Doc<T>;
    if ((doc as any).userId !== userId) {
      const err = new Error("Not found") as any;
      err.statusCode = 404;
      throw err;
    }
    return doc;
  }

  /** Find first document matching queries */
  async findOne<T>(collectionId: string, queries: string[] | Query[]): Promise<Doc<T> | null> {
    const res = await this.db.listDocuments(this.dbId, collectionId, queries);
    return res.total > 0 ? (res.documents[0] as Doc<T>) : null;
  }

  /** List documents matching queries */
  async list<T>(collectionId: string, queries: string[] | Query[]): Promise<Doc<T>[]> {
    const res = await this.db.listDocuments(this.dbId, collectionId, queries);
    return res.documents as Doc<T>[];
  }
}

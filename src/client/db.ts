// Copyright DataStax, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in docs
import { Admin, Client, Collection, extractDbIdFromUrl, SomeDoc } from '@/src/client';
import type { HttpClient, RawDataApiResponse } from '@/src/api';
import { DataApiHttpClient } from '@/src/api';
import {
  BaseOptions,
  CollectionInfo,
  CreateCollectionCommand,
  CreateCollectionOptions,
  createCollectionOptionsKeys,
  listCollectionOptionsKeys,
  ListCollectionsCommand,
  ListCollectionsOptions
} from '@/src/client/types';
import { DatabaseInfo } from '@/src/client/types/admin/database-info';

/**
 * Represents an interface to some Astra database instance.
 *
 * **Shouldn't be instantiated directly, use {@link Client.db} to obtain an instance of this class.**
 *
 * @example
 * ```typescript
 * const db = client.db("my-db");
 * ```
 */
export class Db {
  private readonly _httpClient: DataApiHttpClient;
  private readonly _namespace: string;
  private readonly _id?: string;
  private _admin?: Admin;

  constructor(httpClient: HttpClient, name: string) {
    this._httpClient = httpClient.cloneInto(DataApiHttpClient, c => c.namespace = name);
    this._namespace = name;
    this._id = extractDbIdFromUrl(httpClient.baseUrl);
  }

  /**
   * @return The namespace (aka keyspace) of the database.
   */
  get namespace(): string {
    return this._namespace;
  }

  /**
   * @return The ID of the database if it was successfully parsed from the given API endpoint.
   */
  get id(): string | undefined {
    return this._id;
  }

  admin(): Admin {
    if (!this._id) {
      throw new Error('Admin operations are only supported on Astra databases');
    }
    if (!this._admin) {
      this._admin = new Admin(this._httpClient, this._id);
    }
    return this._admin;
  }

  async info(): Promise<DatabaseInfo> {
    return await this.admin().info().then(i => i.info);
  }

  /**
   * Establishes a reference to a collection in the database. This method does not perform any I/O.
   *
   * **NB. This method does not validate the existence of the collection—it simply creates a reference.**
   *
   * **Unlike the MongoDB driver, this method does not create a collection if it doesn't exist.**
   *
   * Use {@link createCollection} to create a new collection.
   *
   * Typed as `Collection<SomeDoc>` by default, but you can specify a schema type to get a typed collection.
   *
   * @example
   * ```typescript
   * interface User {
   *   name: string,
   *   age?: number,
   * }
   *
   * const users = db.collection<User>("users");
   * users.insertOne({ name: "John" });
   * ```
   *
   * @param name The name of the collection.
   *
   * @return A reference to the collection.
   *
   * @see Collection
   * @see SomeDoc
   */
  collection<Schema extends SomeDoc = SomeDoc>(name: string): Collection<Schema> {
    return new Collection<Schema>(this, this._httpClient, name);
  }

  /**
   * Creates a new collection in the database, and establishes a reference to it.
   *
   * **NB. You are limited to 5 collections per database in Astra, so be wary when using this command.**
   *
   * This is a blocking command which performs actual I/O unlike {@link collection}, which simply creates an
   * unvalidated reference to a collection.
   *
   * Typed as `Collection<SomeDoc>` by default, but you can specify a schema type to get a typed collection.
   *
   * @example
   * ```typescript
   * interface User {
   *   name: string,
   *   age?: number,
   * }
   *
   * const users = await db.createCollection<User>("users");
   * users.insertOne({ name: "John" });
   * ```
   *
   * @param collectionName The name of the collection to create.
   * @param options Options for the collection.
   *
   * @return A promised reference to the newly created collection.
   *
   * @see Collection
   * @see SomeDoc
   */
  async createCollection<Schema extends SomeDoc = SomeDoc>(collectionName: string, options?: CreateCollectionOptions<Schema>): Promise<Collection<Schema>> {
    const command: CreateCollectionCommand = {
      createCollection: {
        name: collectionName,
      },
    };

    if (options) {
      command.createCollection.options = options;
    }

    await this._httpClient.executeCommand(command, options, createCollectionOptionsKeys);

    return this.collection(collectionName);
  }

  /**
   * Drops a collection from the database.
   *
   * @param name The name of the collection to drop.
   *
   * @param options Options for the operation.
   *
   * @return A promise that resolves to `true` if the collection was dropped successfully.
   */
  async dropCollection(name: string, options?: BaseOptions): Promise<boolean> {
    const command = {
      deleteCollection: { name },
    };

    const resp = await this._httpClient.executeCommand(command, options);

    return resp.status?.ok === 1 && !resp.errors;
  }

  /**
   * Lists the collections in the database.
   *
   * Set `nameOnly` to `true` to only return the names of the collections.
   *
   * Otherwise, the method returns an array of objects with the collection names and their associated {@link CollectionOptions}.
   *
   * @example
   * ```typescript
   * const collections = await db.listCollections({ nameOnly: true });
   * console.log(collections); // [{ name: "users" }, { name: "posts" }]
   * ```
   *
   * @param options Options for the operation.
   *
   * @return A promise that resolves to an array of collection info.
   *
   * @see CollectionOptions
   */
  async listCollections<NameOnly extends boolean = false>(options?: ListCollectionsOptions<NameOnly>): Promise<CollectionInfo<NameOnly>[]> {
    const command: ListCollectionsCommand = {
      findCollections: {
        options: {
          explain: options?.nameOnly === false,
        }
      },
    }

    const resp = await this._httpClient.executeCommand(command, options, listCollectionOptionsKeys);

    return (options?.nameOnly !== false)
      ? resp.status!.collections.map((name: string) => ({ name }))
      : resp.status!.collections;
  }

  /**
   * Send a POST request to the Data API for this database with an arbitrary, caller-provided payload.
   *
   * You can specify a collection to target with the `collection` parameter, thereby allowing you to perform
   * arbitrary collection-level operations as well.
   *
   * If no collection is specified, the command will be executed at the database level.
   *
   * @example
   * ```typescript
   * const colls = await db.command({ findCollections: {} });
   * console.log(colls); // { status: { collections: [] } }
   *
   * const users = await db.command({ findOne: {} }, "users");
   * console.log(users); // { data: { document: null } }
   * ```
   *
   * @param command The command to send to the Data API.
   * @param collection The optional name of the collection to target.
   *
   * @return A promise that resolves to the raw response from the Data API.
   */
  async command(command: Record<string, any>, collection?: string): Promise<RawDataApiResponse> {
    return await this._httpClient.executeCommand(command, { collection: collection });
  }
}

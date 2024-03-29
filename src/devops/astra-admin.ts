import {
  AdminBlockingOptions,
  CreateDatabaseOptions,
  DatabaseConfig,
  FullDatabaseInfo,
  ListDatabasesOptions
} from '@/src/devops/types';
import { Db, mkDb } from '@/src/data-api';
import { DEFAULT_DEVOPS_API_ENDPOINT, DEFAULT_NAMESPACE, DevopsApiHttpClient, HTTP_METHODS } from '@/src/api';
import { AstraDbAdmin } from '@/src/devops/astra-db-admin';
import { AdminSpawnOptions, DbSpawnOptions, RootClientOptsWithToken } from '@/src/client/types';

type AdminOptions = RootClientOptsWithToken & { adminOptions: { adminToken: string } };

/**
 * An administrative class for managing Astra databases, including creating, listing, and deleting databases.
 *
 * **Shouldn't be instantiated directly; use {@link DataApiClient.admin} to obtain an instance of this class.**
 *
 * To perform admin tasks on a per-database basis, see the {@link AstraDbAdmin} class.
 *
 * @example
 * ```typescript
 * const client = new DataApiClient('token');
 *
 * // Create an admin instance with the default token
 * const admin1 = client.admin();
 *
 * // Create an admin instance with a custom token
 * const admin2 = client.admin({ adminToken: 'stronger-token' });
 *
 * const dbs = await admin1.listDatabases();
 * console.log(dbs);
 * ```
 *
 * @see DataApiClient.admin
 * @see AstraDbAdmin
 */
export class AstraAdmin {
  readonly #defaultOpts!: RootClientOptsWithToken;

  private readonly _httpClient!: DevopsApiHttpClient;

  /**
   * Use {@link DataApiClient.admin} to obtain an instance of this class.
   *
   * @internal
   */
  constructor(options: AdminOptions) {
    const adminOpts = options.adminOptions ?? {};

    this.#defaultOpts = options;

    Object.defineProperty(this, '_httpClient', {
      value: new DevopsApiHttpClient({
        baseUrl: adminOpts.endpointUrl || DEFAULT_DEVOPS_API_ENDPOINT,
        applicationToken: adminOpts.adminToken,
        caller: options.caller,
        logLevel: options.logLevel,
      }),
      enumerable: false,
    });
  }

  /**
   * Spawns a new {@link Db} instance using a direct endpoint and given options.
   *
   * This endpoint should include the protocol and the hostname, but not the path. It's typically in the form of
   * `https://<db_id>-<region>.apps.astra.datastax.com`, but it can be used with DSE or any other Data-API-compatible
   * endpoint.
   *
   * The given options will override any default options set when creating the {@link DataApiClient} through
   * a deep merge (i.e. unset properties in the options object will just default to the default options).
   *
   * @example
   * ```typescript
   * const admin = new DataApiClient('token').admin();
   *
   * const db1 = admin.db('https://<db_id>-<region>.apps.astra.datastax.com');
   *
   * const db2 = admin.db('https://<db_id>-<region>.apps.astra.datastax.com', {
   *   namespace: 'my-namespace',
   *   useHttp2: false,
   * });
   * ```
   *
   * @remarks
   * Note that this does not perform any IO or validation on if the endpoint is valid or not. It's up to the user to
   * ensure that the endpoint is correct. If you want to create an actual database, see {@link createDatabase}
   * instead.
   *
   * @param endpoint - The direct endpoint to use.
   * @param options - Any options to override the default options set when creating the {@link DataApiClient}.
   *
   * @returns A new {@link Db} instance.
   */
  db(endpoint: string, options?: DbSpawnOptions): Db;

  /**
   * Spawns a new {@link Db} instance using a direct endpoint and given options.
   *
   * This overload is purely for user convenience, but it **only supports using Astra as the underlying database**. For
   * DSE or any other Data-API-compatible endpoint, use the other overload instead.
   *
   * The given options will override any default options set when creating the {@link DataApiClient} through
   * a deep merge (i.e. unset properties in the options object will just default to the default options).
   *
   * @example
   * ```typescript
   * const admin = new DataApiClient('token').admin();
   *
   * const db1 = admin.db('a6a1d8d6-31bc-4af8-be57-377566f345bf', 'us-east1');
   *
   * const db2 = admin.db('a6a1d8d6-31bc-4af8-be57-377566f345bf', 'us-east1', {
   *   namespace: 'my-namespace',
   *   useHttp2: false,
   * });
   * ```
   *
   * @remarks
   * Note that this does not perform any IO or validation on if the endpoint is valid or not. It's up to the user to
   * ensure that the endpoint is correct. If you want to create an actual database, see {@link createDatabase}
   * instead.
   *
   * @param id - The database ID to use.
   * @param region - The region to use.
   * @param options - Any options to override the default options set when creating the {@link DataApiClient}.
   *
   * @returns A new {@link Db} instance.
   */
  db(id: string, region: string, options?: DbSpawnOptions): Db;

  db(endpointOrId: string, regionOrOptions?: string | DbSpawnOptions, maybeOptions?: DbSpawnOptions): Db {
    return mkDb(this.#defaultOpts, endpointOrId, regionOrOptions, maybeOptions);
  }

  /**
   * Spawns a new {@link AstraDbAdmin} instance for a database using a direct endpoint and given options.
   *
   * This endpoint should include the protocol and the hostname, but not the path. It's typically in the form of
   * `https://<db_id>-<region>.apps.astra.datastax.com`, but it can be used with DSE or any other Data-API-compatible
   * endpoint.
   *
   * The given options are for the underlying implicitly-created {@link Db} instance, not the {@link AstraDbAdmin} instance.
   * The db admin will use the same options as this {@link AstraAdmin} instance.
   *
   * The given options will override any default options set when creating the {@link DataApiClient} through
   * a deep merge (i.e. unset properties in the options object will just default to the default options).
   *
   * @example
   * ```typescript
   * const admin = new DataApiClient('token').admin();
   *
   * const dbAdmin1 = admin.dbAdmin('https://<db_id>-<region>...');
   *
   * const dbAdmin2 = admin.dbAdmin('https://<db_id>-<region>...', {
   *   namespace: 'my-namespace',
   *   useHttp2: false,
   * });
   * ```
   *
   * @remarks
   * Note that this does not perform any IO or validation on if the endpoint is valid or not. It's up to the user to
   * ensure that the endpoint is correct. If you want to create an actual database, see {@link createDatabase}
   * instead.
   *
   * @param endpoint - The direct endpoint to use.
   * @param options - Any options to override the default options set when creating the {@link DataApiClient}.
   *
   * @returns A new {@link Db} instance.
   */
  dbAdmin(endpoint: string, options?: DbSpawnOptions): AstraDbAdmin;

  /**
   * Spawns a new {@link Db} instance using a direct endpoint and given options.
   *
   * This overload is purely for user convenience, but it **only supports using Astra as the underlying database**. For
   * DSE or any other Data-API-compatible endpoint, use the other overload instead.
   *
   * The given options are for the underlying implicitly-created {@link Db} instance, not the {@link AstraDbAdmin} instance.
   * The db admin will use the same options as this {@link AstraAdmin} instance.
   *
   * The given options will override any default options set when creating the {@link DataApiClient} through
   * a deep merge (i.e. unset properties in the options object will just default to the default options).
   *
   * @example
   * ```typescript
   * const admin = new DataApiClient('token').admin();
   *
   * const dbAdmin1 = admin.dbAdmin('a6a1d8d6-...-377566f345bf', 'us-east1');
   *
   * const dbAdmin2 = admin.dbAdmin('a6a1d8d6-...-377566f345bf', 'us-east1', {
   *   namespace: 'my-namespace',
   *   useHttp2: false,
   * });
   * ```
   *
   * @remarks
   * Note that this does not perform any IO or validation on if the endpoint is valid or not. It's up to the user to
   * ensure that the endpoint is correct. If you want to create an actual database, see {@link createDatabase}
   * instead.
   *
   * @param id - The database ID to use.
   * @param region - The region to use.
   * @param options - Any options to override the default options set when creating the {@link DataApiClient}.
   *
   * @returns A new {@link Db} instance.
   */
  dbAdmin(id: string, region: string, options?: DbSpawnOptions): AstraDbAdmin;

  dbAdmin(endpointOrId: string, regionOrOptions?: string | DbSpawnOptions, maybeOptions?: DbSpawnOptions): AstraDbAdmin {
    // @ts-expect-error - calls internal representation of method
    return this.db(endpointOrId, regionOrOptions, maybeOptions).admin(this.#defaultOpts.adminOptions);
  }

  /**
   * Lists all databases in the current org/account, matching the optionally provided filter.
   *
   * Note that this method is paginated, but the page size is high enough that most users won't need to worry about it.
   * However, you can use the `limit` and `skip` options to control the number of results returned and the starting point
   * for the results, as needed.
   *
   * You can also filter by the database status using the `include` option, and by the database provider using the
   * `provider` option.
   *
   * See {@link ListDatabasesOptions} for complete information about the options available for this operation.
   *
   * @example
   * ```typescript
   * const admin = new DataApiClient('AstraCS:...').admin();
   *
   * const activeDbs = await admin.listDatabases({ include: 'ACTIVE' });
   *
   * for (const db of activeDbs) {
   *   console.log(`Database ${db.name} is active`);
   * }
   * ```
   *
   * @param options - The options to filter the databases by.
   * @returns A list of the complete information for all the databases matching the given filter.
   */
  public async listDatabases(options?: ListDatabasesOptions): Promise<FullDatabaseInfo[]> {
    const resp = await this._httpClient.request({
      method: HTTP_METHODS.Get,
      path: `/databases`,
      params: {
        include: options?.include,
        provider: options?.provider,
        limit: options?.limit,
        starting_after: options?.skip,
      },
    });
    return resp.data;
  }

  /**
   * Creates a new database with the given configuration.
   *
   * **NB. this is a long-running operation. See {@link AdminBlockingOptions} about such blocking operations.**
   *
   * Note that **the `name` field is non-unique** and thus creating a database, even with the same options, is **not
   * idempotent**.
   *
   * You may also provide options for the implicit {@link Db} instance that will be created with the database, which
   * will override any default options set when creating the {@link DataApiClient} through a deep merge (i.e. unset
   * properties in the options object will just default to the default options).
   *
   * See {@link CreateDatabaseOptions} for complete information about the options available for this operation.
   *
   * @example
   * ```typescript
   * const newDbAdmin1 = await admin.createDatabase({
   *   name: 'my_database_1',
   *   cloudProvider: 'GCP',
   *   region: 'us-east1',
   * });
   *
   * // Prints '[]' as there are no collections in the database yet
   * console.log(newDbAdmin1.db().listCollections());
   *
   * const newDbAdmin2 = await admin.createDatabase({
   *   name: 'my_database_2',
   *   cloudProvider: 'GCP',
   *   region: 'us-east1',
   *   namespace: 'my_namespace',
   * }, {
   *   blocking: false,
   *   dbOptions: {
   *     useHttp2: false,
   *     token: '<weaker-token>',
   *   },
   * });
   *
   * // Can't do much else as the database is still initializing
   * console.log(newDbAdmin2.db().id);
   * ```
   *
   * @remarks
   * Note that if you choose not to block, the returned {@link AstraDbAdmin} object will not be very useful until the
   * operation completes, which is up to the caller to determine.
   *
   * @param config - The configuration for the new database.
   * @param options - The options for the blocking behavior of the operation.
   *
   * @returns The AstraDbAdmin instance for the newly created database.
   */
  public async createDatabase(config: DatabaseConfig, options?: CreateDatabaseOptions): Promise<AstraDbAdmin> {
    const definition = {
      capacityUnits: 1,
      tier: 'serverless',
      dbType: 'vector',
      keyspace: config.namespace || DEFAULT_NAMESPACE,
      ...config,
    }

    const resp = await this._httpClient.request({
      method: HTTP_METHODS.Post,
      path: '/databases',
      data: definition,
    });

    const db = mkDb(this.#defaultOpts, resp.headers.location, definition.region, { ...options?.dbOptions, namespace: definition.keyspace });
    const admin = db.admin(this.#defaultOpts.adminOptions);

    await this._httpClient.awaitStatus(db, 'ACTIVE', ['INITIALIZING', 'PENDING'], options, 10000);
    return admin;
  }

  /**
   * Terminates a database by ID or by a given {@link Db} instance.
   *
   * **NB. this is a long-running operation. See {@link AdminBlockingOptions} about such blocking operations.**
   *
   * The database info will still be accessible by ID, or by using the {@link listDatabases} method with the filter
   * set to `'ALL'` or `'TERMINATED'`. However, all of its data will very much be lost.
   *
   * @example
   * ```typescript
   * const db = client.db('https://<db_id>-<region>.apps.astra.datastax.com');
   * await admin.dropDatabase(db);
   *
   * // Or just
   * await admin.dropDatabase('a6a1d8d6-31bc-4af8-be57-377566f345bf');
   * ```
   *
   * @param db - The database to drop, either by ID or by instance.
   * @param options - The options for the blocking behavior of the operation.
   *
   * @remarks Use with caution. Wear a harness. Don't say I didn't warn you.
   */
  async dropDatabase(db: Db | string, options?: AdminBlockingOptions): Promise<void> {
    const id = typeof db === 'string' ? db : db.id;

    await this._httpClient.request({
      method: HTTP_METHODS.Post,
      path: `/databases/${id}/terminate`,
    });
    await this._httpClient.awaitStatus({ id }, 'TERMINATED', ['TERMINATING'], options, 10000);
  }
}

/**
 * @internal
 */
export function mkAdmin(rootOpts: RootClientOptsWithToken, options?: AdminSpawnOptions): AstraAdmin {
  return new AstraAdmin({
    ...rootOpts,
    adminOptions: {
      ...rootOpts?.adminOptions,
      ...options,
    },
  });
}

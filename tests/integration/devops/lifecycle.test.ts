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
// noinspection DuplicatedCode

import { assertTestsEnabled, initTestObjects } from '@/tests/fixtures';
import { DataApiClient } from '@/src/client';
import assert from 'assert';

describe('integration.devops.lifecycle', async () => {
  let client: DataApiClient;

  before(async function () {
    assertTestsEnabled(this, 'ADMIN', 'LONG');

    [client] = await initTestObjects(this);

    const dbs = await client.admin().listDatabases();

    if (dbs.some(db => db.info.name === 'astra-test-db')) {
      // throw new Error('Database \'astra-test-db\' already exists, drop it to proceed w/ lifecycle test');
    }
  });

  it('[admin] [long] works blocking', async () => {
    try {
      const admin = client.admin();

      const dbAdmin = await admin.createDatabase({
        name: 'astra-test-db',
        cloudProvider: 'GCP',
        region: 'us-east1',
      });
      const db = dbAdmin.db();

      assert.ok(db.id, 'Database ID is missing');
      assert.strictEqual(db.namespace, 'default_keyspace', 'Database namespace is incorrect');

      const dbInfo = await db.info();
      assert.strictEqual(dbInfo.name, 'astra-test-db', 'Database info name is incorrect');
      assert.strictEqual(dbInfo.cloudProvider, 'GCP', 'Database info cloud provider is incorrect');
      assert.strictEqual(dbInfo.region, 'us-east1', 'Database info region is incorrect');
      assert.strictEqual(dbInfo.keyspace, 'default_keyspace', 'Database info keyspace is incorrect');

      const collections1 = await db.listCollections();
      assert.deepStrictEqual(collections1, [], 'Collections are not empty')

      const collection = await db.createCollection('test_collection');
      assert.ok(collection, 'Collection is missing');
      assert.strictEqual(collection.collectionName, 'test_collection', 'Collection name is incorrect');
      assert.deepStrictEqual(await collection.options(), {}, 'Collection options are not empty');

      const collections2 = await db.listCollections();
      assert.deepStrictEqual(collections2, [{ name: 'test_collection' }], 'Collections are incorrect');

      const dbs1 = await admin.listDatabases();
      assert.ok(dbs1.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' is missing');

      const dbs2 = await admin.listDatabases({ include: 'ACTIVE' });
      assert.ok(dbs2.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' is missing from ACTIVE');

      const namespaces = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces, ['default_keyspace'], 'Namespaces are incorrect');

      await dbAdmin.createNamespace('other_namespace');

      const namespaces2 = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces2, ['default_keyspace', 'other_namespace'], 'Namespaces are incorrect');

      await dbAdmin.dropNamespace('other_namespace');

      const namespaces3 = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces3, ['default_keyspace'], 'Namespaces are incorrect');

      await dbAdmin.drop();

      const dbs3 = await admin.listDatabases();
      assert.ok(!dbs3.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' still exists');
    } catch (e) {
      console.error(e);
      assert.fail('An error occurred during the lifecycle test');
    }
  }).timeout(0);

  it('[admin] [long] works non-blocking', async () => {
    try {
      const admin = client.admin();

      const dbAdmin = await admin.createDatabase({
        name: 'astra-test-db',
        cloudProvider: 'GCP',
        region: 'us-east1',
        namespace: 'my_namespace',
      }, {
        blocking: false,
        dbOptions: {
          useHttp2: false,
        }
      });
      const db = dbAdmin.db();

      assert.ok(db.id, 'Database ID is missing');
      assert.strictEqual(db.namespace, 'my_namespace', 'Database namespace is incorrect');
      assert.strictEqual(db.httpStrategy() === 'http2', false, 'Database HTTP/2 usage is incorrect');

      const fullDbInfo1 = await dbAdmin.info();
      assert.ok(['PENDING', 'INITIALIZING'].includes(fullDbInfo1.status), 'Database status is incorrect');
      assert.strictEqual(fullDbInfo1.info.name, 'astra-test-db', 'Database info name is incorrect');
      assert.strictEqual(fullDbInfo1.info.cloudProvider, 'GCP', 'Database info cloud provider is incorrect');
      assert.strictEqual(fullDbInfo1.info.region, 'us-east1', 'Database info region is incorrect');
      assert.strictEqual(fullDbInfo1.info.keyspace, 'my_namespace', 'Database info keyspace is incorrect');

      await dbAdmin['_httpClient'].awaitStatus(db, 'ACTIVE', ['INITIALIZING', 'PENDING'], {}, 10000);

      const fullDbInfo2 = await dbAdmin.info();
      assert.strictEqual(fullDbInfo2.status, 'ACTIVE', 'Database status is incorrect');
      assert.strictEqual(fullDbInfo2.info.name, 'astra-test-db', 'Database info name is incorrect');
      assert.strictEqual(fullDbInfo2.info.cloudProvider, 'GCP', 'Database info cloud provider is incorrect');
      assert.strictEqual(fullDbInfo2.info.region, 'us-east1', 'Database info region is incorrect');
      assert.strictEqual(fullDbInfo2.info.keyspace, 'my_namespace', 'Database info keyspace is incorrect');

      const collections1 = await db.listCollections();
      assert.deepStrictEqual(collections1, [], 'Collections are not empty')

      const collection = await db.createCollection('test_collection');
      assert.ok(collection, 'Collection is missing');
      assert.strictEqual(collection.collectionName, 'test_collection', 'Collection name is incorrect');
      assert.deepStrictEqual(await collection.options(), {}, 'Collection options are not empty');

      const collections2 = await db.listCollections();
      assert.deepStrictEqual(collections2, [{ name: 'test_collection' }], 'Collections are incorrect');

      const dbs1 = await admin.listDatabases();
      assert.ok(dbs1.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' is missing');

      const dbs2 = await admin.listDatabases({ include: 'ACTIVE' });
      assert.ok(dbs2.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' is missing from ACTIVE');

      const namespaces = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces, ['my_namespace'], 'Namespaces are incorrect');

      await dbAdmin.createNamespace('other_namespace', { blocking: false });

      const fullDbInfo3 = await dbAdmin.info();
      assert.strictEqual(fullDbInfo3.status, 'MAINTENANCE', 'Database status is incorrect');
      assert.strictEqual(fullDbInfo3.info.keyspace, 'my_namespace', 'Database info keyspace is incorrect');
      assert.strictEqual(fullDbInfo3.info.additionalKeyspaces, undefined, 'Database info keyspace is incorrect');

      await dbAdmin['_httpClient'].awaitStatus(db, 'ACTIVE', ['MAINTENANCE'], {}, 1000);

      const namespaces2 = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces2, ['my_namespace', 'other_namespace'], 'Namespaces are incorrect');

      await dbAdmin.dropNamespace('other_namespace', { blocking: false });

      const fullDbInfo4 = await dbAdmin.info();
      assert.strictEqual(fullDbInfo4.status, 'MAINTENANCE', 'Database status is incorrect');
      assert.strictEqual(fullDbInfo4.info.keyspace, 'my_namespace', 'Database info keyspace is incorrect');
      assert.deepStrictEqual(fullDbInfo4.info.additionalKeyspaces, ['other_namespace'], 'Database info keyspace is incorrect');

      await dbAdmin['_httpClient'].awaitStatus(db, 'ACTIVE', ['MAINTENANCE'], {}, 1000);

      const fullDbInfo5 = await dbAdmin.info();
      assert.strictEqual(fullDbInfo5.status, 'ACTIVE', 'Database status is incorrect');
      assert.strictEqual(fullDbInfo5.info.keyspace, 'my_namespace', 'Database info keyspace is incorrect');
      assert.strictEqual(fullDbInfo5.info.additionalKeyspaces, undefined, 'Database info keyspace is incorrect');

      const namespaces3 = await dbAdmin.listNamespaces();
      assert.deepStrictEqual(namespaces3, ['my_namespace'], 'Namespaces are incorrect');

      await admin.dropDatabase(db);

      const dbs3 = await admin.listDatabases();
      assert.ok(!dbs3.find(db => db.info.name === 'astra-test-db'), 'Database \'astra-test-db\' still exists');
    } catch (e) {
      console.error(e);
      assert.fail('An error occurred during the lifecycle test');
    }
  }).timeout(0);
});

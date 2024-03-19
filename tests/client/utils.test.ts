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

import assert from 'assert';
import { AstraDB } from '@/src/client';

describe('Utils test', () => {
  it('initialized w/ default keyspace', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint);
    assert.strictEqual(
      astraDb['_httpClient'].baseUrl,
      'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1',
    );
  });

  it('adds a keyspace properly', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint, 'testks1');
    assert.strictEqual(
      astraDb['_httpClient'].baseUrl,
      'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/api/json/v1',
    );
  });

  it('uses http2 by default', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint);
    assert.strictEqual(astraDb['_httpClient'].isUsingHttp2(), true);
  });

  it('handles forcing http2', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint, {
      useHttp2: true,
    });
    assert.strictEqual(astraDb['_httpClient'].isUsingHttp2(), true);
  });

  it('handles forcing http1.1', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint, {
      useHttp2: false,
    });
    assert.strictEqual(astraDb['_httpClient'].isUsingHttp2(), false);
  });

  it('handles different base api path', () => {
    const apiEndPoint = 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com';
    const astraDb = new AstraDB('myToken', apiEndPoint, 'ks', {
      baseApiPath: 'some/random/path',
    });
    assert.strictEqual(
      astraDb['_httpClient'].baseUrl,
      'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com/some/random/path',
    );
    assert.strictEqual(astraDb['_httpClient'].isUsingHttp2(), true);
  });

  it('throws error on empty keyspace', () => {
    assert.rejects(async () => {
      new AstraDB('myToken', 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com', '');
    });
  });

  it('throws error on bad keyspace', () => {
    assert.rejects(async () => {
      new AstraDB('myToken', 'https://a5cf1913-b80b-4f44-ab9f-a8b1c98469d0-ap-south-1.apps.astra.datastax.com', '23][ep3[2xr3][2r');
    });
  });
});

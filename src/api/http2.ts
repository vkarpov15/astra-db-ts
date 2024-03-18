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

import * as http2 from 'http2';
import { HTTPRequestStrategy, InternalAPIResponse, InternalHTTPRequestInfo } from '@/src/api/types';
import { DataAPITimeout } from '@/src/client/errors';

export class HTTP2Strategy implements HTTPRequestStrategy {
  origin: string;
  closed: boolean = false;
  session: http2.ClientHttp2Session;

  constructor(baseURL: string) {
    this.origin = new URL(baseURL).origin;
    this.session = this._reviveSession();
  }

  async request(info: InternalHTTPRequestInfo): Promise<InternalAPIResponse> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        throw new Error('Cannot make http2 request when client is closed');
      }

      // Recreate session if session was closed except via an explicit `close()`
      // call. This happens when nginx sends a GOAWAY packet after 1000 requests.
      if (this.session.closed) {
        this.session = this._reviveSession();
      }

      const timer = setTimeout(() => reject(new DataAPITimeout(info.data, info.timeout)), info.timeout);

      const path = info.url.replace(this.origin, '');
      const params = info.params ? `?${new URLSearchParams(info.params).toString()}` : '';

      const req = this.session.request({
        ':path': path + params,
        ':method': info.method,
        token: info.token,
        'User-Agent': info.userAgent,
      });

      if (info.data) {
        req.write(info.serializer(info.data), 'utf8');
      }
      req.end();

      let status = 0;
      req.on('response', (data) => {
        clearTimeout(timer);
        status = data[':status'] ?? 0;
      });

      req.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });

      req.setEncoding('utf8');

      let responseBody = '';
      req.on('data', (chunk: string) => {
        responseBody += chunk;
      });

      req.on('end', () => {
        clearTimeout(timer);

        try {
          const data = JSON.parse(responseBody);
          resolve({ status, data });
        } catch (error) {
          reject(new Error('Unable to parse response as JSON, got: "' + responseBody + '"'));
        }
      });
    });
  }

  close() {
    this.session.close();
    this.closed = true;
  }

  private _reviveSession() {
    if (this.session && !this.session.closed) {
      return this.session;
    }

    const session = http2.connect(this.origin);

    // Without these handlers, any errors will end up as uncaught exceptions,
    // even if they are handled in `_request()`.
    // More info: https://github.com/nodejs/node/issues/16345
    session.on('error', () => {});
    session.on('socketError', () => {});

    return session;
  }
}

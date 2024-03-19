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

import { setLevel } from '@/src/logger';
import { EJSON } from 'bson';
import { CLIENT_USER_AGENT, DEFAULT_METHOD, DEFAULT_TIMEOUT } from '@/src/api/constants';
import {
  Caller,
  HTTPRequestInfo,
  HTTPRequestStrategy,
  InternalAPIResponse,
  InternalHTTPClientOptions
} from '@/src/api/types';
import { HTTP1AuthHeaderFactories, HTTP1Strategy } from '@/src/api/http1';
import { HTTP2Strategy } from '@/src/api/http2';
import { Mutable } from '@/src/client/types/utils';

const applicationTokenKey = Symbol('applicationToken');

export class HttpClient {
  readonly baseUrl: string;
  readonly requestStrategy: HTTPRequestStrategy;
  readonly logSkippedOptions: boolean;
  readonly userAgent: string;
  private [applicationTokenKey]!: string;

  constructor(options: InternalHTTPClientOptions) {
    if (typeof window !== "undefined") {
      throw new Error("not for use in a web browser");
    }

    if (!options.baseUrl) {
      throw new Error("baseUrl required for initialization");
    }

    if (!options.applicationToken) {
      throw new Error("applicationToken required for initialization");
    }

    Object.defineProperty(this, applicationTokenKey, {
      value: options.applicationToken,
      enumerable: false,
      writable: true,
    });

    this.baseUrl = options.baseUrl;
    this.logSkippedOptions = options.logSkippedOptions ?? false;

    this.requestStrategy =
      (options.requestStrategy)
        ? options.requestStrategy :
      (options.useHttp2 !== false)
        ? new HTTP2Strategy(this.baseUrl)
        : new HTTP1Strategy(HTTP1AuthHeaderFactories.DataApi);

    if (options.logLevel) {
      setLevel(options.logLevel);
    }

    if (options.baseApiPath) {
      this.baseUrl += '/' + options.baseApiPath;
    }

    this.userAgent = options.userAgent ?? buildUserAgent(CLIENT_USER_AGENT, options.caller);
  }

  close() {
    this.requestStrategy.close?.();
  }

  isClosed(): boolean | undefined {
    return this.requestStrategy.closed;
  }

  isUsingHttp2(): boolean {
    return this.requestStrategy instanceof HTTP2Strategy;
  }

  cloneInto<C extends HttpClient>(cons: new (opts: InternalHTTPClientOptions) => C, initialize: (client: Mutable<C>) => void): C {
    const clone = new cons({
      baseUrl: this.baseUrl,
      applicationToken: this[applicationTokenKey],
      logSkippedOptions: this.logSkippedOptions,
      requestStrategy: this.requestStrategy,
      userAgent: this.userAgent,
    });
    initialize(clone);
    return clone;
  }

  protected async _request(info: HTTPRequestInfo): Promise<InternalAPIResponse> {
    return await this.requestStrategy.request({
      url: info.url,
      data: info.data,
      timeout: info.timeout || DEFAULT_TIMEOUT,
      method: info.method || DEFAULT_METHOD,
      params: info.params ?? {},
      token: this[applicationTokenKey],
      userAgent: this.userAgent,
      timeoutError: info.timeoutError,
    });
  }
}

export function serializeCommand(data: Record<string, any>, pretty?: boolean): string {
  return EJSON.stringify(data, (_: unknown, value: any) => handleValues(value), pretty ? "  " : "");
}

function handleValues(value: any): any {
  if (value && typeof value === "bigint") {
    // BigInt handling
    return Number(value);
  } else if (value && typeof value === "object") {
    // ObjectId to strings
    if (value.$oid) {
      return value.$oid;
    } else if (value.$numberDecimal) {
      // Decimal128 handling
      return Number(value.$numberDecimal);
    } else if (value.$binary?.subType === "03" || value.$binary?.subType === "04") {
      // UUID handling. Subtype 03 or 04 is UUID. Refer spec : https://bsonspec.org/spec.html
      return Buffer.from(value.$binary.base64, "base64")
        .toString("hex")
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    }
    // Date handling
    else if (value.$date) {
      // Use numbers instead of strings for dates
      value.$date = new Date(value.$date).valueOf();
    }
  }
  // all other values
  return value;
}

function buildUserAgent(client: string, caller?: Caller | Caller[]): string {
  const callers = (
    (!caller)
      ? [] :
    Array.isArray(caller[0])
      ? caller
      : [caller]
  ) as Caller[];

  const callerString = callers.map((c) => {
    return c[1] ? `${c[0]}/${c[1]}` : c[0];
  }).join(' ');

  return `${callerString} ${client}`.trim();
}

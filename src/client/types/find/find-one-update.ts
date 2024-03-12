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

import { ProjectionOption, SomeDoc } from '@/src/client';
import { BaseOptions, SortOption } from '@/src/client/types/common';

/** @internal */
export interface FindOneAndUpdateCommand {
  findOneAndUpdate: {
    filter?: Record<string, unknown>;
    update?: Record<string, any>;
    options?: {
      returnDocument: 'before' | 'after',
      upsert?: boolean,
    };
    sort?: SortOption<any>;
    projection?: ProjectionOption<any>;
  };
}

/**
 * Represents the options for the `findOneAndUpdate` command.
 *
 * @field returnDocument - Specifies whether to return the original or updated document.
 * @field upsert - If true, perform an insert if no documents match the filter.
 * @field sort - The sort order to pick which document to update if the filter selects multiple documents.
 */
export interface FindOneAndUpdateOptions<Schema extends SomeDoc> extends BaseOptions {
  /**
   * Specifies whether to return the document before or after the update.
   *
   * Set to `before` to return the document before the update to see the original state of the document.
   *
   * Set to `after` to return the document after the update to see the updated state of the document immediately.
   */
  returnDocument: 'before' | 'after',
  /**
   * If true, perform an insert if no documents match the filter.
   *
   * If false, do not insert if no documents match the filter.
   *
   * Defaults to false.
   * @default false
   */
  upsert?: boolean,
  /**
   * The order in which to apply the update if the filter selects multiple documents.
   *
   * If multiple documents match the filter, only one will be updated.
   *
   * Defaults to `null`, where the order is not guaranteed.
   * @default null
   */
  sort?: SortOption<Schema>,
  /**
   * Specifies which fields should be included/excluded in the returned documents.
   *
   * If not specified, all fields are included.
   */
  projection?: ProjectionOption<Schema>,
  /**
   * When true, returns alongside the document, an `ok` field with a value of 1 if the command executed successfully.
   *
   * Otherwise, returns the document result directly.
   *
   * Defaults to false.
   * @default false
   */
  includeResultMetadata?: boolean,
}

/** @internal */
export const findOneAndUpdateOptionsKeys = new Set(['upsert', 'returnDocument']);

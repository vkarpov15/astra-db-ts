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

import type { BaseOptions, ProjectionOption, SortOption } from '@/src/data-api/types';
import { SomeDoc } from '@/src/data-api';

/** @internal */
export interface FindOneAndDeleteCommand {
  findOneAndDelete: {
    filter?: Record<string, unknown>;
    sort?: SortOption<any>;
    projection?: ProjectionOption<any>;
  };
}

/**
 * Represents the options for the `findOneAndDelete` command.
 *
 * @field sort - The sort order to pick which document to delete if the filter selects multiple documents.
 */
export interface FindOneAndDeleteOptions<Schema extends SomeDoc> extends BaseOptions {
  /**
   * The order in which to apply the update if the filter selects multiple documents.
   *
   * If multiple documents match the filter, only one will be updated.
   *
   * Defaults to `null`, where the order is not guaranteed.
   * @defaultValue null
   */
  sort?: SortOption<Schema>,
  vector?: number[],
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
   * @defaultValue false
   */
  includeResultMetadata?: boolean,
}

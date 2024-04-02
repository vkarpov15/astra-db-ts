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

import { WithNamespace } from '@/src/data-api';
import { WithTimeout } from '@/src/common/types';

/**
 * Options for dropping a collection.
 *
 * @field namespace - Overrides the namespace for the collection.
 * @field maxTimeMS - The maximum time to allow the operation to run.
 *
 * @see Db.dropCollection
 */
export interface DropCollectionOptions extends WithTimeout, WithNamespace {}

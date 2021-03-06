'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type NuclideCheckbox from './NuclideCheckbox';

module.exports =
  (require('../../nuclide-atom-npm').load(__dirname, 'NuclideCheckbox'): Class<NuclideCheckbox>);

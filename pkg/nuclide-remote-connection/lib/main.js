'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {RemoteConnection} from './RemoteConnection';
import {RemoteDirectory} from './RemoteDirectory';
import {RemoteFile} from './RemoteFile';

import {
  SshHandshake,
  decorateSshConnectionDelegateWithTracking,
} from './SshHandshake';

import {getFileForPath} from './client';

import {
  getService,
  getServiceByNuclideUri,
  getServiceLogger,
} from './service-manager';

/**
 * Can't use `export {...} from '..';` because some tests depend on being able
 * to mock this module.
 */

module.exports = {
  RemoteConnection,
  RemoteDirectory,
  RemoteFile,
  SshHandshake,
  decorateSshConnectionDelegateWithTracking,
  getFileForPath,
  getService,
  getServiceByNuclideUri,
  getServiceLogger,
};

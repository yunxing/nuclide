'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {
  ExecutorError,
  ExecutorResponse,
  ExecutorResult,
  ExecutorRequest,
  RnRequest,
  ServerReplyCallback,
} from './types';
import type {EventEmitter} from 'events';

import featureConfig from '../../nuclide-feature-config';
import {forkWithExecEnvironment, getOutputStream} from '../../nuclide-commons/lib/process';
import {getLogger} from '../../nuclide-logging';
import invariant from 'assert';
import path from 'path';
import Rx from 'rx';

const logger = getLogger();

export default class Child {

  _closed: Promise<mixed>;
  _execScriptMessageId: number;
  _process$: Rx.Observable<child_process$ChildProcess>;
  _input$: Rx.Subject<ExecutorRequest>;

  constructor(onReply: ServerReplyCallback, emitter: EventEmitter) {
    this._execScriptMessageId = -1;

    const execPath = featureConfig.get('nuclide-react-native.pathToNode');
    const process$ = this._process$ = Rx.Observable.fromPromise(
      // TODO: The node location/path needs to be more configurable. We need to figure out a way to
      //   handle this across the board.
      forkWithExecEnvironment(
        path.join(__dirname, 'executor.js'),
        [],
        {execPath, silent: true},
      )
    );

    // Pipe output from forked process. This just makes things easier to debug for us.
    process$
      .flatMapLatest(process => getOutputStream(process))
      .subscribe(message => {
        switch (message.kind) {
          case 'error':
            logger.error(message.error.message);
            return;
          case 'stderr':
          case 'stdout':
            logger.info(message.data.toString());
            return;
        }
      });

    this._closed = process$.flatMap(process => Rx.Observable.fromEvent(process, 'close'))
      .first()
      .toPromise();

    // A stream of messages we're sending to the executor.
    this._input$ = new Rx.Subject();

    // The messages we're receiving from the executor.
    const output$ = (
      process$.flatMap(
        process => Rx.Observable.fromEvent(process, 'message')
      ): Rx.Observable<ExecutorResponse>
    );

    const result$ = (
      (output$.filter(message => message.kind === 'result'): any): Rx.Observable<ExecutorResult>
    );
    const error$ = (
      (output$.filter(message => message.kind === 'error'): any): Rx.Observable<ExecutorError>
    );

    // Emit the eval_application_script event when we get the message that corresponds to it.
    result$
      .filter(
        message => message.kind === 'result' && message.replyId === this._execScriptMessageId
      )
      .first()
      .combineLatest(process$)
      .map(([, process]) => process.pid)
      .subscribe(pid => {
        emitter.emit('eval_application_script', pid);
      });

    // Forward the output we get from the process to subscribers
    result$.subscribe(message => { onReply(message.replyId, message.result); });

    // Log the errors.
    error$.subscribe(error => { logger.error(error.message); });

    // Buffer the messages until we have a process to send them to, then send them.
    const bufferedMessage$ = this._input$.takeUntil(process$).buffer(process$).flatMap(x => x);
    const remainingMessages = this._input$.skipUntil(process$);
    bufferedMessage$.concat(remainingMessages)
      .combineLatest(process$)
      .subscribe(([message, process]) => {
        process.send(message);
      });
  }

  async kill(): Promise<void> {
    // Kill the process once we have one.
    this._process$.subscribe(process => { process.kill(); });
    await this._closed;
  }

  executeApplicationScript(script: string, inject: string, id: number) {
    this._execScriptMessageId = id;
    this._input$.onNext({
      id,
      op: 'executeApplicationScript',
      data: {
        script,
        inject,
      },
    });
  }

  execCall(payload: RnRequest, id: number) {
    invariant(payload.method != null);
    this._input$.onNext({
      id,
      op: 'call',
      data: {
        method: payload.method,
        arguments: payload.arguments,
      },
    });
  }
}

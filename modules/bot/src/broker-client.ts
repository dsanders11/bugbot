import debug from 'debug';
import fetch, { Response } from 'node-fetch';
import { URL } from 'url';
import { v4 as mkuuid } from 'uuid';

// import { FiddleBisectResult } from '@electron/bugbot-runner/build/fiddle-bisect-parser';
import {
  BisectJob,
  Job,
  JobId,
} from '@electron/bugbot-shared/build/interfaces';

import { BisectCommand } from './issue-parser';

const DebugPrefix = 'BrokerAPI';

export class APIError extends Error {
  public res: Response;

  constructor(res: Response, message: string) {
    super(message);
    this.res = res;
  }
}

export default class BrokerAPI {
  private readonly authToken: string;
  private readonly baseURL: string;

  constructor(props: { authToken: string; baseURL: string }) {
    this.authToken = props.authToken;
    this.baseURL = props.baseURL;
  }

  public async queueBisectJob(command: BisectCommand): Promise<string> {
    const d = debug(`${DebugPrefix}:queueBisectJob`);

    const url = new URL('/api/jobs', this.baseURL);
    d('url', url);

    const bisectJob: BisectJob = {
      bisect_range: [command.goodVersion, command.badVersion],
      gist: command.gistId,
      history: [],
      id: mkuuid(),
      time_added: Date.now(),
      type: 'bisect',
    };

    const body = JSON.stringify(bisectJob);
    d('body', body);
    const response = await fetch(url.toString(), {
      body,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const { status, statusText } = response;
    d('status', status, 'statusText', statusText);
    const jobId = await response.text();
    d('jobId', jobId);
    return jobId;
  }

  public stopJob(jobId: JobId) {
    const url = new URL(`/api/jobs/${jobId}`, this.baseURL);
    console.log('stopping job', { url });
  }

  public async getJob(jobId: JobId): Promise<Job> {
    const d = debug(`${DebugPrefix}:getJob`);

    const url = new URL(`/api/jobs/${jobId}`, this.baseURL);
    d('url', url);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    const { status, statusText } = response;
    d('status', status, 'statusText', statusText);

    return response.json();
  }

  public async completeJob(jobId: JobId): Promise<void> {
    const d = debug(`${DebugPrefix}:completeJob`);

    const url = new URL(`/api/jobs/${jobId}`, this.baseURL);
    d('url', url);

    const response = await fetch(url.toString(), {
      body: JSON.stringify([
        { op: 'replace', path: '/bot_client_data', value: 'complete' },
      ]),
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    const { status, statusText } = response;
    d('status', status, 'statusText', statusText);
  }
}

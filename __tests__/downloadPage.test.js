import { test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import nock from 'nock';
import os from 'os';
import downloadPage from '../src/downloadPage.js';

const { promises: fsp } = fs;

let dir;

beforeEach(async () => {
  nock.disableNetConnect();
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('network error', async () => {
  await expect(downloadPage('https://ru.hexlet.io/courses', '/usr')).rejects.toThrow();
});

test('parsing error', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, '');
  await expect(downloadPage('https://ru.hexlet.io/courses', dir)).rejects.toThrow(new Error('parsing error! page is not valid!'));
});

test('dir read error', async () => {
  await expect(downloadPage('https://ru.hexlet.io/courses', '/sys')).rejects.toThrow();
});

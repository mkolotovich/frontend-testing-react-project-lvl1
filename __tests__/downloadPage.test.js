import { test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import nock from 'nock';
import os from 'os';
import downloadPage from '../src/downloadPage.js';

const { promises: fsp } = fs;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);

let dir;

const data = async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, await fsp.readFile(getFixturePath('sourceWithAliases.html'), 'utf-8'));
  nock('https://ru.hexlet.io')
    .get('/courses//assets/professions/nodejs.png')
    .reply(200, await fsp.readFile(getFixturePath('nodejs.png')));
  nock('https://ru.hexlet.io')
    .get('/courses//assets/application.css')
    .reply(200, await fsp.readFile(getFixturePath('styles.css'), 'utf-8'));
  nock('https://ru.hexlet.io')
    .get('/courses//courses')
    .reply(200, await fsp.readFile(getFixturePath('sourceWithAliases.html'), 'utf-8'));
  nock('https://ru.hexlet.io')
    .get('/packs/js/runtime.js')
    .reply(200);
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
};

const dataWithImage = async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, await fsp.readFile(getFixturePath('source.html'), 'utf-8'));
  nock('https://ru.hexlet.io')
    .get('/courses//assets/professions/nodejs.png')
    .reply(200, await fsp.readFile(getFixturePath('nodejs.png')));
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
};

test('save assets', async () => {
  await data();
  await downloadPage('https://ru.hexlet.io/courses', dir);
  const css = await fsp.readFile(getFixturePath('styles.css'));
  const copydCss = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-application.css'));
  expect(css).toEqual(copydCss);
});

test('save file', async () => {
  await data();
  await downloadPage('https://ru.hexlet.io/courses', dir);
  const file = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses.html'), 'utf-8');
  expect(file).not.toBeNull();
});

test('return right object', async () => {
  await data();
  const file = await fsp.readFile(getFixturePath('expected.json'), 'utf-8');
  const object = JSON.parse(file);
  expect(await downloadPage('https://ru.hexlet.io/courses', '/usr')).toEqual(object);
});

test('modify page', async () => {
  await data();
  await downloadPage('https://ru.hexlet.io/courses', dir);
  const fileExpected = await fsp.readFile(getFixturePath('downloadedWithAliases.html'), 'utf-8');
  const file = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses.html'), 'utf-8');
  expect(file).toEqual(fileExpected);
});

test('modify page with image', async () => {
  await dataWithImage();
  await downloadPage('https://ru.hexlet.io/courses', dir);
  const fileExpected = await fsp.readFile(getFixturePath('downloaded.html'), 'utf-8');
  const file = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses.html'), 'utf-8');
  expect(file).toEqual(fileExpected);
});

test('save image', async () => {
  await data();
  await downloadPage('https://ru.hexlet.io/courses', dir);
  const image = await fsp.readFile(getFixturePath('nodejs.png'));
  const copydImage = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-professions-nodejs.png'));
  expect(image).toEqual(copydImage);
});

test('network error', () => {
  nock.disableNetConnect();
  expect(() => {
    downloadPage('https://ru.hexlet.io/courses', '/usr').toThrow();
  });
});

test('dir read error', () => {
  expect(() => {
    downloadPage('https://ru.hexlet.io/courses', '/sys').toThrow();
  });
});

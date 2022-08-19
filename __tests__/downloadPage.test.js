// import { test, expect, describe } from '@jest/globals';
import { test, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import nock from 'nock';
import os from 'os';
import downloadPage from '../src/downloadPage.js';

const { promises: fsp } = fs;

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);

let dir;

// const data = async () => {
//   nock('https://ru.hexlet.io')
//     .get('/courses')
//     .reply(200, await fsp.readFile(getFixturePath('sourceWithAliases.html'), 'utf-8'));
//   nock('https://ru.hexlet.io')
//     .get('/assets/professions/nodejs.png')
//     .reply(200, await fsp.readFile(getFixturePath('nodejs.png')));
//   nock('https://ru.hexlet.io')
//     .get('/assets/application.css')
//     .reply(200, await fsp.readFile(getFixturePath('styles.css'), 'utf-8'));
//   nock('https://ru.hexlet.io')
//     .get('/courses')
//     .reply(200, await fsp.readFile(getFixturePath('sourceWithAliases.html'), 'utf-8'));
//   nock('https://ru.hexlet.io')
//     .get('/packs/js/runtime.js')
//     .reply(200, await fsp.readFile(getFixturePath('script.js'), 'utf-8'));
//   dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
// };

// const dataWithImage = async () => {
//   nock('https://ru.hexlet.io')
//     .get('/courses')
//     .reply(200, await fsp.readFile(getFixturePath('source.html'), 'utf-8'));
//   nock('https://ru.hexlet.io')
//     .get('/assets/professions/nodejs.png')
//     .reply(200, await fsp.readFile(getFixturePath('nodejs.png')));
//   dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
// };

// describe.each([
//   ['styles.css', 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-application.css'],
//   ['downloadedWithAliases.html', '', 'ru-hexlet-io-courses.html'],
//   ['nodejs.png', 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-professions-nodejs.png'],
// ])('downloadPage(%s, %s, %s)', (a, b, expected) => {
//   test(`returns ${expected}`, async () => {
//     await data();
//     await downloadPage('https://ru.hexlet.io/courses', dir);
//     const source = await fsp.readFile(getFixturePath(a));
//     expect(source).toEqual(await fsp.readFile(path.resolve(dir, b, expected)));
//   });
// });

// test('save file', async () => {
//   await data();
//   await downloadPage('https://ru.hexlet.io/courses', dir);
//   const file = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses.html'), 'utf-8');
//   expect(file).not.toBeNull();
// });

// test('return right object', async () => {
//   await data();
//   const file = await fsp.readFile(getFixturePath('expected.json'), 'utf-8');
//   const object = JSON.parse(file);
//   expect(await downloadPage('https://ru.hexlet.io/courses', '/var/tmp')).toEqual(object);
// });

// test('modify page with image', async () => {
//   await dataWithImage();
//   await downloadPage('https://ru.hexlet.io/courses', dir);
//   const fileExpected = await fsp.readFile(getFixturePath('downloaded.html'), 'utf-8');
//   const file = await fsp.readFile(path.resolve(dir, 'ru-hexlet-io-courses.html'), 'utf-8');
//   expect(file).toEqual(fileExpected);
// });

test('network error', async () => {
  nock.disableNetConnect();
  await expect(downloadPage('https://ru.hexlet.io/courses', '/usr')).rejects.toThrow();
});

test('network error - incorrect assets', async () => {
  nock.disableNetConnect();
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200);
  nock('https://ru.hexlet.io')
    .get('/assets/professions/nodejs.png')
    .reply(404);
  nock('https://ru.hexlet.io')
    .get('/assets/application.css')
    .reply(404, await fsp.readFile(getFixturePath('styles.css'), 'utf-8'));
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(404);
  nock('https://ru.hexlet.io')
    .get('/packs/js/runtime.js')
    .reply(404, await fsp.readFile(getFixturePath('script.js'), 'utf-8'));
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  await expect(downloadPage('https://ru.hexlet.io/courses', '/usr')).rejects.toThrow();
});

test('dir read error', async () => {
  await expect(downloadPage('https://ru.hexlet.io/courses', '/sys')).rejects.toThrow();
});

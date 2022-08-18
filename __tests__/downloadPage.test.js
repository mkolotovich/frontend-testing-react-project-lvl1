// import { test, expect, describe } from '@jest/globals';
import { test, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import nock from 'nock';
import os from 'os';
import prettier from 'prettier';
import downloadPage from '../src/downloadPage.js';

const { promises: fsp } = fs;
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);

// let dir;

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
//     .reply(200);
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

// test('network error', () => {
//   nock.disableNetConnect();
//   expect(() => {
//     downloadPage('https://ru.hexlet.io/courses', '/usr').toThrow();
//   });
// });

// test('dir read error', () => {
//   expect(() => {
//     downloadPage('https://ru.hexlet.io/courses', '/sys').toThrow();
//   });
// });

const prettierOptions = {
  parser: 'html',
  htmlWhitespaceSensitivity: 'ignore',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const buildFixturesPath = (...paths) => path.join(__dirname, '..', '__fixtures__', ...paths);
const readFile = (dirpath, filename, isBinary = false) => (
  fsp.readFile(path.join(dirpath, filename), isBinary ? null : 'utf-8')
);

const pageDirname = 'site-com-blog-about_files';
const pageFilename = 'site-com-blog-about.html';
const baseUrl = 'https://site.com';
const pagePath = '/blog/about';
const pageUrl = new URL(pagePath, baseUrl);

let expectedPageContent = '';
let resources = [
  {
    format: 'css',
    urlPath: '/blog/about/assets/styles.css',
    filename: path.join(
      pageDirname,
      'site-com-blog-about-assets-styles.css',
    ),
  },
  {
    format: 'jpg',
    urlPath: '/photos/me.jpg',
    isBinary: true,
    filename: path.join(
      pageDirname,
      'site-com-photos-me.jpg',
    ),
  },
  {
    format: 'js',
    urlPath: '/assets/scripts.js',
    filename: path.join(
      pageDirname,
      'site-com-assets-scripts.js',
    ),
  },
  {
    format: 'html',
    urlPath: '/blog/about',
    filename: path.join(
      pageDirname,
      'site-com-blog-about.html',
    ),
  },
];

const scope = nock(baseUrl).persist();

nock.disableNetConnect();

beforeAll(async () => {
  const sourcePageContent = await readFile(buildFixturesPath('.'), pageFilename);
  const promises = resources.map((info) => readFile(buildFixturesPath('expected'), info.filename, info.isBinary)
    .then((data) => ({ ...info, data })));

  expectedPageContent = prettier.format(
    await readFile(buildFixturesPath('expected'), pageFilename),
    prettierOptions,
  );
  resources = await Promise.all(promises);

  scope.get(pagePath).reply(200, sourcePageContent);
  resources.forEach(({ urlPath, data }) => scope.get(urlPath).reply(200, data));
});

test('download to current workdir', async () => {
  const cwd = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  process.chdir(cwd);

  await downloadPage(pageUrl.toString());

  await expect(fsp.access(path.join(cwd, pageFilename)))
    .resolves.not.toThrow();

  const loadedAssets = await fsp.readdir(path.join(cwd, pageDirname))
    .then((filenames) => filenames
      .map((filename) => path.join(pageDirname, filename))
      .sort());
  const expectedAssets = resources.map(({ filename }) => filename).sort();

  expect(loadedAssets).toEqual(expectedAssets);
});

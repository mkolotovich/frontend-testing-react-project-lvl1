import * as path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'axios-debug-log';
import debug from 'debug';
import Listr from 'listr';

const { promises: fsp } = fs;
const logPageLoader = debug('page-loader');

const successCode = 200;

const getImages = ($, url, fullDirPath, dirPath, prefix) => {
  const imageTag = $('img');
  const src = Array.from(imageTag).map((element) => $(element).attr('src'));
  $('img').each(function modify(i, elem) {
    $(this).attr('src', `${dirPath}/${prefix}${$(elem).attr('src').replace(/\//g, '-')}`);
  });
  const promises = src.map((el) => {
    const requestUrl = new URL(el, url);
    if (!el.startsWith('http')) {
      return axios({
        method: 'get',
        url: `${requestUrl}`,
        responseType: 'stream',
      })
        .then((response) => {
          if (response.status !== successCode) {
            throw new Error(`network error! ${url}/${el} responded with status - ${response.status}`);
          }
          if (path.extname(el) === '.png' || path.extname(el) === '.jpg') {
            logPageLoader(`${url}/${el}`);
            const normalizedStr = `${prefix}${el.replace(/\//g, '-')}`;
            fsp.writeFile(path.join(fullDirPath, normalizedStr), response.data);
          } else {
            return undefined;
          }
          return response;
        });
    }
    return el;
  });
  return promises;
};

const getLinks = ($, url, fullDirPath, dirPath, prefix) => {
  const linkTag = $('link');
  const src = Array.from(linkTag).map((element) => $(element).attr('href'));
  const promises = src.map((el) => {
    const requestUrl = new URL(el, url);
    if (!el.startsWith('http')) {
      return axios({
        method: 'get',
        url: `${requestUrl}`,
      })
        .then((response) => {
          if (response.status !== successCode) {
            throw new Error(`network error! ${url}/${el} responded with status - ${response.status}`);
          }
          logPageLoader(`${url}/${el}`);
          const normalizedStr = path.extname(el) === '.css' ? `${prefix}${el.replace(/\//g, '-')}` : `${prefix}${el.replace(/\//g, '-')}.html`;
          fsp.writeFile(path.join(fullDirPath, normalizedStr), response.data);
          return response;
        });
    }
    return undefined;
  });
  $('link').each(function modify(i, elem) {
    if (!$(elem).attr('href').startsWith('http')) {
      const normalizedStr = path.extname($(elem).attr('href')) === '.css' ? `${$(elem).attr('href').replace(/\//g, '-')}` : `${$(elem).attr('href').replace(/\//g, '-')}.html`;
      $(this).attr('href', `${dirPath}/${prefix}${normalizedStr}`);
    }
  });
  return promises;
};

const getScripts = ($, url, fullDirPath, dirPath, prefix) => {
  const scriptTag = $('script');
  const pageUrl = new URL(url);
  const src = Array.from(scriptTag).map((element) => $(element).attr('src'));
  const promises = src.map((el) => {
    if (el !== undefined) {
      if (!el.startsWith('http')) {
        return axios({
          method: 'get',
          url: `${url}/${el}`,
        })
          .then((response) => {
            logPageLoader(`${url}/${el}`);
            const normalizedStr = `${prefix}${el.replace(/\//g, '-')}`;
            fsp.writeFile(path.join(fullDirPath, normalizedStr), response.data);
            return response;
          });
      }
      const elUrl = new URL(el);
      if (pageUrl.hostname === elUrl.hostname) {
        return axios({
          method: 'get',
          url: `${el}`,
        })
          .then((response) => {
            if (response.status !== successCode) {
              throw new Error(`network error! ${el} responded with status - ${response.status}`);
            }
            const normalizedStr = `${prefix}${elUrl.pathname.replace(/\//g, '-')}`;
            fsp.writeFile(path.join(fullDirPath, normalizedStr), response.data);
            return response;
          });
      }
    }
    return undefined;
  });
  $('script').each(function modify(i, elem) {
    if ($(elem).attr('src') !== undefined) {
      if (!$(elem).attr('src').startsWith('http')) {
        $(this).attr('src', `${dirPath}/${prefix}${$(elem).attr('src').replace(/\//g, '-')}`);
      } else {
        const elUrl = new URL($(elem).attr('src'));
        if (pageUrl.hostname === elUrl.hostname) {
          $(this).attr('src', `${dirPath}/${prefix}${elUrl.pathname.replace(/\//g, '-')}`);
        }
      }
    }
  });
  return promises;
};

const getAssets = (page, url, fullDirPath, dirPath, prefix) => {
  const $ = cheerio.load(page);
  const images = getImages($, url, fullDirPath, dirPath, prefix);
  const links = getLinks($, url, fullDirPath, dirPath, prefix);
  const scripts = getScripts($, url, fullDirPath, dirPath, prefix);
  return [$.html(), images, links, scripts];
};

export default (url, dir = process.cwd()) => {
  const myURL = new URL(url);
  const fileName = myURL.pathname !== '/' ? `${myURL.hostname.replace(/\./g, '-')}${myURL.pathname.replace(/\//g, '-')}.html` : `${myURL.hostname.replace(/\./g, '-')}.html`;
  const dirName = myURL.pathname !== '/' ? `${myURL.hostname.replace(/\./g, '-')}${myURL.pathname.replace(/\//g, '-')}_files` : `${myURL.hostname.replace(/\./g, '-')}_files`;
  const assetsName = myURL.pathname !== '/' ? `${myURL.hostname.replace(/\./g, '-')}` : `${myURL.hostname.replace(/\./g, '-')}-`;
  const filePath = path.resolve(process.cwd(), dir, fileName);
  const dirPath = path.resolve(process.cwd(), dir, dirName);
  return axios.get(url)
    .then((response) => {
      logPageLoader(url);
      if (response.status !== successCode) {
        throw new Error(`network error! ${url} responded with status - ${response.status}`);
      }
      return response;
    })
    .then((response) => fsp.mkdir(dirPath)
      .then(() => getAssets(response.data, url, dirPath, dirName, assetsName)))
    .catch((error) => {
      if (error.response) {
        throw new Error(`network error! ${url} responded with status - ${error.response.status}`);
      } else if (error.request) {
        throw new Error(`network error! ${url} not responded`);
      } else {
        throw new Error(error.message);
      }
    })
    .then((assets) => {
      const [html, images, links, scripts] = assets;
      fsp.writeFile(filePath, html);
      const obj = { filepath: filePath };
      return Promise.all([...images, ...links, ...scripts])
        .then((items) => {
          items.forEach((el) => {
            if (el !== undefined) {
              const tasks = new Listr([{
                title: `${el.config.url}`,
                task: () => Promise.resolve(el),
              }], { concurrent: true });
              tasks.run();
            }
          });
          return obj;
        });
    });
};

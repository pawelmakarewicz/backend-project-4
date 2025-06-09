import path from 'path';
import * as cheerio from 'cheerio';
import { writeFile } from 'node:fs/promises';
import httpClient from '../client/client.js';

function formatUrl(url) {
  // Remove the protocol (http:// or https://)
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');

  // Replace all dots with hyphens and add .html at the end
  const formattedUrl = `${urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-')}.html`;

  return formattedUrl;
}

// TO DO  write ok transform
const transformPath = (originalPath) => {
  const cleanPath = originalPath.startsWith('/')
    ? originalPath.substring(1)
    : originalPath;
  const pathWithDashes = cleanPath.replace(/\//g, '-');
  return `ru-hexlet-io-courses_files/ru-hexlet-io-${pathWithDashes}`;
};

const transformImagePaths = (htmlData, transformFn) => {
  const $ = cheerio.load(htmlData);
  const originalPaths = [];

  // Process each img element directly - no risk of wrong replacement
  $('img').each((_, el) => {
    const $img = $(el);
    const originalSrc = $img.attr('src');

    if (originalSrc) {
      // Store original path
      originalPaths.push(originalSrc);

      // Transform and replace immediately on this specific element
      const newSrc = transformFn(originalSrc);
      $img.attr('src', newSrc);
    }
  });

  return {
    originalPaths,
    modifiedHtml: $.html(),
  };
};

export default function pageLoader({ url, output }) {
  let pathToOutputFile;

  return httpClient
    .get(url)
    .then((resData) => {
      const fileName = formatUrl(url);
      pathToOutputFile = path.join(output || process.cwd(), fileName);

      const { originalPaths, modifiedHtml } = transformImagePaths(
        resData,
        transformPath,
      );
      // TO DO ORIGINAL PATHS MAKE AXIOSS GET REQUEST
      return Promise.all([writeFile(pathToOutputFile, modifiedHtml), originalPaths]);
    })
    .then(() => {
      console.log(pathToOutputFile);
      return pathToOutputFile;
    });
}

// const mock = `<html lang="ru">
//   <head>
//     <meta charset="utf-8">
//     <title>Курсы по программированию Хекслет</title>
//   </head>
//   <body>
//     <img src="1" alt="Иконка профессии Node.js-программист">
//     <img src="2" alt="Иконка профессии Node.js-программист">
//     <h3>
//       <a href="/professions/nodejs">Node.js-программист</a>
//     </h3>
//   </body>
// </html>`;

// console.log("imgSrcArray", transformImagePaths(mock, transformPath));

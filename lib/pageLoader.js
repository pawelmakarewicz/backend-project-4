import path from 'path';
import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';
import httpClient from '../client/client.js';

function formatUrl(url) {
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
  const [domainPart] = urlWithoutProtocol.split('/');
  const formattedDomain = domainPart.replace(/\./g, '-');
  const formattedFullUrl = urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-');

  return { domain: formattedDomain, fullUrl: formattedFullUrl };
}

const createTransformPath = (folderName, domain) => (originalPath) => {
  const cleanPath = originalPath.startsWith('/')
    ? originalPath.substring(1)
    : originalPath;
  const pathWithDashes = cleanPath.replace(/\//g, '-');
  return `${folderName}/${domain}-${pathWithDashes}`;
};

const transformImagePaths = (htmlData, transformFn) => {
  const $ = cheerio.load(htmlData);
  const originalPaths = [];

  $('img').each((_, el) => {
    const $img = $(el);
    const originalSrc = $img.attr('src');
    if (originalSrc) {
      originalPaths.push(originalSrc);
      const newSrc = transformFn(originalSrc);
      $img.attr('src', newSrc);
    }
  });

  return { originalPaths, modifiedHtml: $.html() };
};

export default function pageLoader({ url, output }) {
  const outputDir = output || process.cwd();
  let htmlData;
  let originalPaths;
  let modifiedHtml;
  let folderName;
  let domain;

  // 1. Скачать файл
  return httpClient
    .get(url)
    .then((data) => {
      htmlData = data;

      // 2. Трансформировать его
      const { domain: d, fullUrl } = formatUrl(url);
      domain = d;
      folderName = `${fullUrl}_files`;

      const transformPath = createTransformPath(folderName, domain);
      const result = transformImagePaths(htmlData, transformPath);

      originalPaths = result.originalPaths;
      modifiedHtml = result.modifiedHtml;

      // Сохранить HTML
      const fileName = `${fullUrl}.html`;
      const pathToOutputFile = path.join(outputDir, fileName);
      return writeFile(pathToOutputFile, modifiedHtml);
    })
    .then(() => {
      // 3. Создать папку
      const folderPath = path.join(outputDir, folderName);
      return mkdir(folderPath, { recursive: true });
    })
    .then(() => Promise.all(
      originalPaths.map((originalPath) => {
        const fullImageUrl = originalPath.startsWith('http')
          ? originalPath
          : new URL(originalPath, url).href;

        const cleanPath = originalPath.startsWith('/')
          ? originalPath.substring(1)
          : originalPath;
        const imageName = `${domain}-${cleanPath.replace(/\//g, '-')}`;
        const imagePath = path.join(outputDir, folderName, imageName);

        return httpClient
          .getBinary(fullImageUrl)
          .then((imageData) => writeFile(imagePath, Buffer.from(imageData)))
          .catch((err) => console.log(`Ошибка ${originalPath}:`, err.message));
      }),
    ))
    .then(() => {
      console.log('Готово!');
    });
}

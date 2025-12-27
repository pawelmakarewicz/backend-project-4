// page-loader.js
import path from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import httpClient from './client/client.js';
import {
  createTransformPath,
  transformResources,
  formatUrl,
  generateResourcePath,
} from './lib/lib.js';

function resolveResourceUrl(resourceUrl, pageUrl) {
  try {
    return new URL(resourceUrl, pageUrl).href;
  } catch (err) {
    console.error(`Не удалось разрешить URL: ${resourceUrl}`, err.message);
    throw err;
  }
}

function downloadResource(resourceUrl, resourcePath, originalUrl, resourceType) {
  const downloadMethod = resourceType === 'html'
    ? httpClient.get(resourceUrl)
    : httpClient.getBinary(resourceUrl);

  return downloadMethod
    .then((data) => writeFile(resourcePath, data))
    .then(() => ({ success: true, url: originalUrl }))
    .catch((err) => {
      console.error(`Ошибка загрузки ${originalUrl}:`, err.message);
      return { success: false, url: originalUrl, error: err.message };
    });
}

function downloadAllResources(resources, pageUrl, domain, folderName, outputPath) {
  if (resources.length === 0) {
    console.log('Локальных ресурсов не найдено');
    return Promise.resolve([]);
  }

  const folderPath = path.join(outputPath, folderName);

  return mkdir(folderPath, { recursive: true })
    .then(() => {
      const downloadPromises = resources.map((resource) => {
        const fullUrl = resolveResourceUrl(resource.url, pageUrl);
        const resourcePath = generateResourcePath(resource.url, domain, folderName);
        const filePath = path.join(outputPath, resourcePath);

        return downloadResource(fullUrl, filePath, resource.url, resource.type);
      });

      return Promise.all(downloadPromises);
    });
}

export default function pageLoader({ url, output }) {
  const outputDir = output || process.cwd();

  return httpClient
    .get(url)
    .then((htmlData) => {
      const { domain, fullUrl } = formatUrl(url);
      const folderName = `${fullUrl}_files`;
      const transformPath = createTransformPath(folderName, domain);

      const { modifiedHtml, resources } = transformResources(
        htmlData,
        url,
        transformPath,
      );

      const fileName = `${fullUrl}.html`;
      const pathToOutputFile = path.join(outputDir, fileName);

      return writeFile(pathToOutputFile, modifiedHtml)
        .then(() => ({
          pathToOutputFile,
          resources,
          pageUrl: url,
          domain,
          folderName,
          outputPath: outputDir,
        }));
    })
    .then((context) => {
      const {
        pathToOutputFile, resources, pageUrl, domain, folderName, outputPath,
      } = context;

      return downloadAllResources(resources, pageUrl, domain, folderName, outputPath)
        .then((results) => {
          const failed = results.filter((r) => !r.success);
          const succeeded = results.filter((r) => r.success);

          if (failed.length > 0) {
            console.warn(`Не удалось загрузить ${failed.length} ресурсов`);
          }
          console.log(`Загружено ресурсов: ${succeeded.length}`);

          return pathToOutputFile;
        });
    })
    .then((pathToOutputFile) => {
      console.log(`Страница сохранена: ${pathToOutputFile}`);
      return pathToOutputFile;
    })
    .catch((err) => {
      console.error('Ошибка загрузки страницы:', err.message);
      throw err;
    });
}

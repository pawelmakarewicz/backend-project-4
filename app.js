import path from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import Listr from 'listr';
import {
  info, fs, warn,
} from './logger/index.js';
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
    console.error('Failed to resolve URL: %s - %s', resourceUrl, err.message);
    throw err;
  }
}

function downloadResource({
  resourceUrl,
  resourcePath,
  originalUrl,
  resourceType,
}) {
  const downloadMethod = resourceType === 'html'
    ? httpClient.get(resourceUrl)
    : httpClient.getBinary(resourceUrl);

  return downloadMethod
    .then((data) => writeFile(resourcePath, data))
    .then(() => ({ success: true, url: originalUrl }))
    .catch((err) => {
      console.error('✗ Download failed %s: %s', originalUrl, err.message);
      return Promise.reject(new Error(err.message));
    });
}

const createTasks = (resources) => new Listr(
  resources.map((res) => ({
    title: res.resourceUrl,
    task: () => downloadResource(res),
  })),
  { concurrent: true, exitOnError: false },
);

function downloadAllResources(
  resources,
  pageUrl,
  domain,
  folderName,
  outputPath,
) {
  if (resources.length === 0) {
    info('No local resources found');
    return Promise.resolve([]);
  }

  info('Found %d resources to download', resources.length);
  const folderPath = path.join(outputPath, folderName);

  return mkdir(folderPath, { recursive: true }).then(() => {
    fs('Directory created: %s', folderPath);

    const resourcesData = resources.map((res) => {
      const resourceUrl = resolveResourceUrl(res.url, pageUrl);
      const resourcePath = path.join(
        outputPath,
        generateResourcePath(res.url, domain, folderName),
      );

      return {
        resourceUrl,
        resourcePath,
        originalUrl: res.url,
        resourceType: res.type,
      };
    });
    const tasks = createTasks(resourcesData);
    return tasks.run().catch((err) => warn(err.message));
  });
}

export default function pageLoader(url, output = process.cwd()) {
  info('Starting page download: %s', url);
  const outputDir = output || process.cwd();

  return httpClient
    .get(url)
    .then((htmlData) => {
      info('HTML received, size: %d bytes', htmlData.length);

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

      return writeFile(pathToOutputFile, modifiedHtml).then(() => {
        fs('HTML file saved: %s', pathToOutputFile);
        return {
          pathToOutputFile,
          resources,
          pageUrl: url,
          domain,
          folderName,
          outputPath: outputDir,
        };
      });
    })
    .then((context) => {
      const {
        pathToOutputFile,
        resources,
        pageUrl,
        domain,
        folderName,
        outputPath,
      } = context;

      return downloadAllResources(
        resources,
        pageUrl,
        domain,
        folderName,
        outputPath,
      ).then(() => pathToOutputFile);
    })
    .then((pathToOutputFile) => {
      console.log('Page was sussefully downloaded into', pathToOutputFile);
      return pathToOutputFile;
    })
    .catch((err) => {
      console.error('✗ Critical error loading page: %s', err.message);
      throw err;
    });
}

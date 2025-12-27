import * as cheerio from 'cheerio';

export function formatUrl(url) {
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
  const [domainPart] = urlWithoutProtocol.split('/');
  const formattedDomain = domainPart.replace(/\./g, '-');
  const formattedFullUrl = urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-');

  return { domain: formattedDomain, fullUrl: formattedFullUrl };
}

export function isLocalResource(resourceUrl, pageUrl) {
  console.log('IS LOCAL RESOURCE', { resourceUrl, pageUrl });

  try {
    if (!resourceUrl.startsWith('http')) {
      return true;
    }
    const pageHostname = new URL(pageUrl).hostname;
    const resourceHostname = new URL(resourceUrl).hostname;
    return resourceHostname === pageHostname;
  } catch {
    return false;
  }
}

function getFileExtension(url) {
  try {
    const urlObj = new URL(url, 'http://example.com');
    const { pathname } = urlObj;
    const lastDot = pathname.lastIndexOf('.');

    if (lastDot === -1 || lastDot === pathname.length - 1) {
      return null;
    }

    return pathname.slice(lastDot + 1);
  } catch {
    return null;
  }
}

export const createTransformPath = (folderName, domain) => (originalPath) => {
  const cleanPath = originalPath.startsWith('/')
    ? originalPath.substring(1)
    : originalPath;
  const pathWithDashes = cleanPath.replace(/\//g, '-');
  return `${folderName}/${domain}-${pathWithDashes}`;
};

export const transformResources = (htmlData, pageUrl, transformFn) => {
  const $ = cheerio.load(htmlData);
  const resources = [];

  // Обработка img src
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && isLocalResource(src, pageUrl)) {
      resources.push({ url: src, type: 'img' });
      $el.attr('src', transformFn(src));
    }
  });

  // Обработка link href (только для локальных)
  $('link').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (href && isLocalResource(href, pageUrl)) {
      const ext = getFileExtension(href);
      // Если нет расширения - это HTML документ
      const resourceType = ext ? 'link' : 'html';
      resources.push({ url: href, type: resourceType });
      $el.attr('href', transformFn(href));
    }
  });

  // Обработка script src
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && isLocalResource(src, pageUrl)) {
      resources.push({ url: src, type: 'script' });
      $el.attr('src', transformFn(src));
    }
  });

  console.log('RES', resources);

  return { resources, modifiedHtml: $.html() };
};

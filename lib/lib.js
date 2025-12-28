// lib.js
import * as cheerio from 'cheerio'

const normalizePath = (path) => {
  try {
    const url = new URL(path)
    return url.pathname.replace(/^\//, '')
  }
  catch {
    return path.replace(/^\//, '')
  }
}

export function formatUrl(url) {
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '')
  const [domainPart] = urlWithoutProtocol.split('/')
  const formattedDomain = domainPart.replace(/\./g, '-')
  const formattedFullUrl = urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-')

  return { domain: formattedDomain, fullUrl: formattedFullUrl }
}

export function isLocalResource(resourceUrl, pageUrl) {
  try {
    if (!resourceUrl.startsWith('http')) {
      return true
    }
    const pageHostname = new URL(pageUrl).hostname
    const resourceHostname = new URL(resourceUrl).hostname
    return resourceHostname === pageHostname
  }
  catch {
    return false
  }
}

function getFileExtension(url) {
  try {
    const urlObj = new URL(url, 'http://example.com')
    const pathname = urlObj.pathname.split('?')[0] // убираем query params
    const lastDot = pathname.lastIndexOf('.')
    const lastSlash = pathname.lastIndexOf('/')

    // Расширение должно быть после последнего слэша
    if (lastDot === -1 || lastDot < lastSlash || lastDot === pathname.length - 1) {
      return null
    }

    return pathname.slice(lastDot + 1).toLowerCase()
  }
  catch {
    return null
  }
}

// Определяем тип ресурса для правильной обработки
function getResourceType(url, elementType) {
  const ext = getFileExtension(url)

  if (!ext) {
    // Если нет расширения - это HTML документ (для link)
    return elementType === 'link' ? 'html' : elementType
  }

  // Для элементов с расширением возвращаем их базовый тип
  return elementType
}

// Генерирует путь к файлу ресурса
export function generateResourcePath(originalUrl, domain, folderName) {
  const normalizedPath = normalizePath(originalUrl)
  const ext = getFileExtension(originalUrl)

  let pathWithDashes = normalizedPath.replace(/\//g, '-')

  // Добавляем .html только если нет расширения
  if (!ext) {
    pathWithDashes = `${pathWithDashes}.html`
  }

  return `${folderName}/${domain}-${pathWithDashes}`
}

export const createTransformPath = (folderName, domain) => originalPath => generateResourcePath(originalPath, domain, folderName)

export const transformResources = (htmlData, pageUrl, transformFn) => {
  const $ = cheerio.load(htmlData)
  const resources = []

  // Обработка img src
  $('img').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src')
    if (src && isLocalResource(src, pageUrl)) {
      resources.push({ url: src, type: 'img' })
      $el.attr('src', transformFn(src))
    }
  })

  // Обработка link href
  $('link').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href')
    if (href && isLocalResource(href, pageUrl)) {
      const resourceType = getResourceType(href, 'link')
      resources.push({ url: href, type: resourceType })
      $el.attr('href', transformFn(href))
    }
  })

  // Обработка script src
  $('script').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src')
    if (src && isLocalResource(src, pageUrl)) {
      resources.push({ url: src, type: 'script' })
      $el.attr('src', transformFn(src))
    }
  })

  return { resources, modifiedHtml: $.html() }
}

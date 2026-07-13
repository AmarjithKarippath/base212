import { useEffect } from 'react'

interface PageMeta {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  keywords?: string[]
}

const SITE_NAME = 'base212'
const DEFAULT_OG_IMAGE = 'https://www.base212.com/og-image.jpg'

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export function usePageMeta({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  keywords,
}: PageMeta) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
    document.title = fullTitle

    upsertMeta('description', description)
    upsertMeta('og:type', ogType, 'property')
    upsertMeta('og:site_name', SITE_NAME, 'property')
    upsertMeta('og:title', title, 'property')
    upsertMeta('og:description', description, 'property')
    upsertMeta('og:image', ogImage, 'property')
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', title)
    upsertMeta('twitter:description', description)
    upsertMeta('twitter:image', ogImage)

    if (keywords?.length) {
      upsertMeta('keywords', keywords.join(', '))
    }

    if (canonical) {
      upsertCanonical(canonical)
      upsertMeta('og:url', canonical, 'property')
    }
  }, [title, description, canonical, ogType, ogImage, keywords])
}

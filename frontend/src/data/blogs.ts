import blogData from './blog-data.json'
import type { BlogPost } from '../types/blog'

export const blogPosts = blogData as BlogPost[]

export function getBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  )
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getBlogPostUrl(slug: string): string {
  return `https://www.base212.com/blogs/${slug}`
}

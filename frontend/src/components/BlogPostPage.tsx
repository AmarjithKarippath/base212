import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getBlogPost, getBlogPostUrl } from '../data/blogs'
import { usePageMeta } from '../hooks/usePageMeta'
import { normalizeMarkdown } from '../utils/markdown'
import { BlogHeader } from './BlogHeader'

interface BlogPostPageProps {
  slug: string
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const post = getBlogPost(slug)

  usePageMeta({
    title: post?.title ?? 'Article not found',
    description: post?.meta_description ?? 'base212 blog article',
    canonical: post ? getBlogPostUrl(post.slug) : undefined,
    ogType: 'article',
    keywords: post?.keywords,
  })

  useEffect(() => {
    if (!post) {
      return
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.meta_description,
      datePublished: post.published_at,
      author: {
        '@type': 'Organization',
        name: 'base212',
      },
      publisher: {
        '@type': 'Organization',
        name: 'base212',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.base212.com/og-image.jpg',
        },
      },
      mainEntityOfPage: getBlogPostUrl(post.slug),
      keywords: post.keywords.join(', '),
    })
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [post])

  if (!post) {
    return (
      <div className="blog-page">
        <BlogHeader />
        <main className="blog-shell">
          <article className="blog-article">
            <h1>Article not found</h1>
            <p>The blog post you are looking for does not exist.</p>
            <a href="/blogs">Back to blog</a>
          </article>
        </main>
      </div>
    )
  }

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="blog-shell">
        <article className="blog-article">
          <p className="blog-article__breadcrumb">
            <a href="/blogs">Blog</a>
            <span aria-hidden="true"> / </span>
            <span>{post.target_audience}</span>
          </p>
          <header className="blog-article__header">
            <p className="blog-article__meta">
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              <span>{post.word_count} words</span>
            </p>
            <h1 className="blog-article__title">{post.title}</h1>
            <p className="blog-article__excerpt">{post.excerpt}</p>
          </header>

          <div className="blog-article__content message__content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="table-wrap">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {normalizeMarkdown(post.content)}
            </ReactMarkdown>
          </div>

          <footer className="blog-article__footer">
            <div className="blog-article__tags">
              {post.keywords.map((keyword) => (
                <span key={keyword} className="blog-card__tag">
                  {keyword}
                </span>
              ))}
            </div>
            <a className="blog-article__cta" href="/">
              {post.cta}
            </a>
          </footer>
        </article>
      </main>
    </div>
  )
}

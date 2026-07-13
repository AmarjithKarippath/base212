import { getBlogPosts } from '../data/blogs'
import { usePageMeta } from '../hooks/usePageMeta'
import { BlogHeader } from './BlogHeader'

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BlogIndex() {
  const posts = getBlogPosts()

  usePageMeta({
    title: 'Blog',
    description:
      'Guides for solo founders, indie hackers, and micro SaaS builders — micro SaaS ideas, AI teams, MRR growth, and build in public.',
    canonical: 'https://www.base212.com/blogs',
    keywords: [
      'micro saas',
      'indie hacker',
      'solo founder',
      'build in public',
      'ai powered saas',
    ],
  })

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="blog-shell">
        <header className="blog-hero">
          <p className="blog-hero__eyebrow">base212 blog</p>
          <h1 className="blog-hero__title">Build smarter, not alone</h1>
          <p className="blog-hero__subtitle">
            Practical guides for solo founders, indie hackers, and micro SaaS builders.
          </p>
        </header>

        <section className="blog-list" aria-label="Blog posts">
          {posts.map((post) => (
            <article key={post.slug} className="blog-card">
              <p className="blog-card__meta">
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                <span>{post.word_count} words</span>
              </p>
              <h2 className="blog-card__title">
                <a href={`/blogs/${post.slug}`}>{post.title}</a>
              </h2>
              <p className="blog-card__excerpt">{post.excerpt}</p>
              <div className="blog-card__tags">
                {post.keywords.slice(0, 4).map((keyword) => (
                  <span key={keyword} className="blog-card__tag">
                    {keyword}
                  </span>
                ))}
              </div>
              <a className="blog-card__link" href={`/blogs/${post.slug}`}>
                Read article →
              </a>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

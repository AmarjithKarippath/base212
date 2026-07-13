export function BlogHeader() {
  return (
    <header className="blog-header">
      <a className="blog-header__brand" href="/">
        <span className="blog-header__mark">212</span>
        <span className="blog-header__name">base212</span>
      </a>
      <nav className="blog-header__nav" aria-label="Site">
        <a href="/">App</a>
        <a href="/blogs" aria-current="page">Blog</a>
      </nav>
    </header>
  )
}

import { useEffect, useState } from 'react'
import { downloadUsersCsv, fetchAdminStats } from '../api'
import type { AdminStats, UserProfile } from '../types'

interface AdminPanelProps {
  user: UserProfile | null
}

export function AdminPanel({ user }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      await downloadUsersCsv()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  if (!user?.is_admin) {
    return (
      <div className="admin-page">
        <div className="admin-page__panel">
          <h1>Access denied</h1>
          <p>This area is restricted to authorized administrators.</p>
          <a className="admin-page__link" href="/">Back to app</a>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">base212 admin</p>
          <h1 className="admin-page__title">Analytics dashboard</h1>
        </div>
        <div className="admin-page__header-actions">
          <button
            type="button"
            className="admin-page__download"
            disabled={downloading}
            onClick={handleDownload}
          >
            {downloading ? 'Downloading...' : 'Download users CSV'}
          </button>
          <a className="admin-page__link" href="/">Back to chat</a>
        </div>
      </header>

      {loading ? <p className="admin-page__status">Loading stats...</p> : null}
      {error ? <p className="admin-page__error">{error}</p> : null}

      {stats ? (
        <>
          <section className="admin-stats">
            <article className="admin-stat">
              <span className="admin-stat__label">Total app opens</span>
              <strong className="admin-stat__value">{stats.total_sessions}</strong>
            </article>
            <article className="admin-stat">
              <span className="admin-stat__label">Opens without message</span>
              <strong className="admin-stat__value">{stats.visits_without_message}</strong>
            </article>
            <article className="admin-stat">
              <span className="admin-stat__label">Queries executed</span>
              <strong className="admin-stat__value">{stats.total_queries}</strong>
            </article>
            <article className="admin-stat">
              <span className="admin-stat__label">Users logged in</span>
              <strong className="admin-stat__value">{stats.total_users}</strong>
            </article>
          </section>

          <section className="admin-table-grid">
            <AdminTable title="App opens by date" rows={stats.sessions_by_date} />
            <AdminTable title="Opens without message by date" rows={stats.visits_without_message_by_date} />
            <AdminTable title="Logins by date" rows={stats.logins_by_date} />
            <AdminTable title="Queries by date" rows={stats.queries_by_date} />
          </section>
        </>
      ) : null}
    </div>
  )
}

function AdminTable({
  title,
  rows,
}: {
  title: string
  rows: AdminStats['logins_by_date']
}) {
  return (
    <article className="admin-table-card">
      <h2 className="admin-table-card__title">{title}</h2>
      {rows.length === 0 ? (
        <p className="admin-table-card__empty">No data yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.date}`}>
                <td>{row.date}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  )
}

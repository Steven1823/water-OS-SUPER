import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isDemoModeEnabled, setDemoModeEnabled } from '../lib/demoMode'
import { useBusinessProfile } from '../hooks/useBusinessProfile'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useAlertCount } from '../hooks/useAlertCount'
import '../styles/layout.css'

type NavItem = {
  to: string
  label: string
  icon: string
  badge?: string
}

type NavGroup = {
  key: string
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'executive',
    title: 'Executive',
    items: [
      { to: '/', label: 'Dashboard', icon: '▦' },
      { to: '/reports', label: 'Reports', icon: 'Q' },
    ],
  },
  {
    key: 'operations',
    title: 'Water Supply',
    items: [
      { to: '/connect-machine', label: 'Connect Machine', icon: '+' },
      { to: '/machines', label: 'Machines', icon: 'M' },
      { to: '/customers', label: 'Customers', icon: 'C' },
      { to: '/customer-types', label: 'Customer Types', icon: 'Y' },
      { to: '/meters', label: 'Meters', icon: 'T' },
      { to: '/readings', label: 'Readings', icon: 'R' },
      { to: '/maintenance', label: 'Maintenance', icon: 'W' },
      { to: '/repairs', label: 'Repairs', icon: 'H' },
      { to: '/leak-reports', label: 'Leak Reports', icon: 'L' },
    ],
  },
  {
    key: 'billing',
    title: 'Revenue',
    items: [
      { to: '/generate-bills', label: 'Generate Bills', icon: 'G' },
      { to: '/billing', label: 'Bills', icon: 'B', badge: '5' },
      { to: '/invoices', label: 'Invoices', icon: 'V' },
      { to: '/payments', label: 'Payments', icon: 'P' },
      { to: '/receive-payment', label: 'Receive Payment', icon: '$' },
      { to: '/receipts', label: 'Receipts', icon: 'E' },
    ],
  },
  {
    key: 'operations-admin',
    title: 'Operations Admin',
    items: [
      { to: '/stock', label: 'Stock', icon: 'S' },
      { to: '/suppliers', label: 'Suppliers', icon: 'U' },
      { to: '/inventory', label: 'Inventory', icon: 'I' },
    ],
  },
  {
    key: 'access',
    title: 'Administration',
    items: [
      { to: '/staff', label: 'Employees', icon: 'E' },
      { to: '/roles-permissions', label: 'Roles & Permissions', icon: 'K' },
      { to: '/settings', label: 'Settings', icon: 'Z' },
    ],
  },
]

function pageTitle(pathname: string): string {
  const found = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.to === pathname)
  return found?.label ?? 'Water Management'
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile: businessProfile } = useBusinessProfile()
  const { profile: currentUser } = useCurrentUserProfile()
  const { count: alertCount } = useAlertCount()
  const demoMode = isDemoModeEnabled()
  const [search, setSearch] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('wms_favorites') || '[]')
    } catch {
      return []
    }
  })
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('wms_recent_pages') || '[]')
    } catch {
      return []
    }
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = window.localStorage.getItem('wms_theme')
    return saved === 'light' ? 'light' : 'dark'
  })

  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('wms_theme', theme)
  }, [theme])

  useEffect(() => {
    const updated = [location.pathname, ...recentPages.filter((path) => path !== location.pathname)].slice(0, 6)
    setRecentPages(updated)
    window.localStorage.setItem('wms_recent_pages', JSON.stringify(updated))
    // Intentionally scoped to pathname changes to avoid repeatedly writing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    window.localStorage.setItem('wms_favorites', JSON.stringify(favorites))
  }, [favorites])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return NAV_GROUPS

    const lower = search.toLowerCase()
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(lower)),
    })).filter((group) => group.items.length > 0)
  }, [search])

  const globalSearchResults = useMemo(() => {
    const query = globalSearch.trim().toLowerCase()
    if (!query) return []
    return NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.label.toLowerCase().includes(query)).slice(0, 6)
  }, [globalSearch])

  const favoriteItems = useMemo(() => {
    const allItems = NAV_GROUPS.flatMap((group) => group.items)
    return allItems.filter((item) => favorites.includes(item.to))
  }, [favorites])

  const recentItems = useMemo(() => {
    const map = new Map(NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.to, item]))
    return recentPages.map((path) => map.get(path)).filter(Boolean) as NavItem[]
  }, [recentPages])

  const toggleFavorite = (path: string) => {
    setFavorites((prev) => {
      if (prev.includes(path)) return prev.filter((item) => item !== path)
      return [...prev, path]
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setDemoModeEnabled(false)
    navigate('/login', { replace: true })
  }

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  const handleGlobalSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    const firstResult = globalSearchResults[0]
    if (firstResult) {
      navigate(firstResult.to)
      setGlobalSearch('')
    }
  }

  const initials = (currentUser.name || 'User')
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={`layout-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="brand-mark" aria-hidden="true">
            W
          </div>
          {!collapsed && (
            <div>
              <h1>{businessProfile?.business_name || 'WaterFlow OS'}</h1>
              <p className="business-meta">{businessProfile?.tagline || 'Municipal Utility'}</p>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? '>' : '<'}
          </button>
        </div>

        {!collapsed && (
          <div className="sidebar-search-wrap">
            <input
              className="sidebar-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quick search"
              aria-label="Quick search"
            />
          </div>
        )}

        <nav className="sidebar-nav">
          {!collapsed && favoriteItems.length > 0 && (
            <div className="nav-section">
              <p className="nav-label">Favorites</p>
              {favoriteItems.map((item) => (
                <Link key={item.to} to={item.to} className={`nav-item ${isActive(item.to) ? 'active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.title} className="nav-section">
              {!collapsed && (
                <button type="button" className="group-toggle" onClick={() => toggleGroup(group.key)}>
                  <span className="nav-label">{group.title}</span>
                  <span>{collapsedGroups[group.key] ? '+' : '-'}</span>
                </button>
              )}
              {!collapsed && collapsedGroups[group.key]
                ? null
                : group.items.map((item) => (
                <div key={item.to} className="nav-row">
                  <Link to={item.to} className={`nav-item ${isActive(item.to) ? 'active' : ''}`}>
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && <span className="nav-text">{item.label}</span>}
                    {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
                  </Link>
                  {!collapsed && (
                    <button
                      className={`pin-btn ${favorites.includes(item.to) ? 'pinned' : ''}`}
                      onClick={() => toggleFavorite(item.to)}
                      aria-label={`Pin ${item.label}`}
                    >
                      *
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {!collapsed && recentItems.length > 0 && (
            <div className="nav-section nav-recent">
              <p className="nav-label">Recent</p>
              {recentItems.map((item) => (
                <Link key={`recent-${item.to}`} to={item.to} className="recent-link">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          {!collapsed ? (
            <>
              <div className="profile-box">
                <div className="profile-avatar">{initials}</div>
                <div>
                  <p className="profile-name">{currentUser.name}</p>
                  <p className="profile-role">{currentUser.role}</p>
                </div>
              </div>
              <button className="logout-btn side-logout" onClick={handleSignOut}>
                Log Out
              </button>
            </>
          ) : (
            <button className="logout-btn side-logout" onClick={handleSignOut}>
              X
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        {demoMode && (
          <div className="demo-banner" role="status">
            You're viewing a demo - changes may not be saved.
          </div>
        )}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 id="page-title">{pageTitle(location.pathname)}</h2>
            <span className="today-stamp">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="top-bar-right">
            <form className="global-search-form" onSubmit={handleGlobalSearchSubmit}>
              <input
                className="global-search"
                placeholder="Search modules"
                aria-label="Global search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
              />
              {globalSearchResults.length > 0 && (
                <div className="global-search-results">
                  {globalSearchResults.map((result) => (
                    <button
                      key={result.to}
                      type="button"
                      className="search-result"
                      onClick={() => {
                        navigate(result.to)
                        setGlobalSearch('')
                      }}
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              )}
            </form>
            <button className="top-action" onClick={() => navigate('/customers')}>+ Quick Add</button>
            <button className="icon-pill" onClick={() => navigate('/maintenance')} aria-label="Alerts">
              A
              <span className="pill-badge">{alertCount}</span>
            </button>
            <button className="icon-pill" onClick={() => navigate('/reports')} aria-label="Messages">
              M
              <span className="pill-badge">4</span>
            </button>
            <select className="business-selector" aria-label="Business selector" defaultValue="main">
              <option value="main">Main Utility</option>
              <option value="demo">Demo Business</option>
            </select>
            <button
              className="theme-btn"
              onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
              aria-label="Switch theme"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <span className="session-label">{demoMode ? 'Demo Session' : 'Live Session'} · {currentUser.email || 'offline'}</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

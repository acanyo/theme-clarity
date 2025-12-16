import { useState, useEffect } from 'preact/hooks'

interface ShuttleProps {
  url: string
  name: string
  logo?: string
  desc?: string
  onClose: () => void
}

export function Shuttle({ url, name, logo, desc, onClose }: ShuttleProps) {
  const [countdown, setCountdown] = useState(5)
  const [jumping, setJumping] = useState(false)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    meta.id = 'shuttle-robots-meta'
    document.head.appendChild(meta)
    return () => document.getElementById('shuttle-robots-meta')?.remove()
  }, [])

  const jump = () => {
    if (jumping) return
    setJumping(true)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    if (countdown <= 0) { jump(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const progress = ((3 - countdown) / 3) * 100

  return (
    <div className="shuttle" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="shuttle__card">
        <div className="shuttle__decor shuttle__decor--1" />
        <div className="shuttle__decor shuttle__decor--2" />
        <button className="shuttle__close" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </button>
        <div className="shuttle__header">
          <span className="shuttle__badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            随机友链
          </span>
        </div>
        <div className="shuttle__site">
          <div className="shuttle__icon">
            {logo ? <img src={logo} alt="" onError={e => (e.target as HTMLImageElement).replaceWith(document.createTextNode('🔗'))} /> : <span>🔗</span>}
          </div>
          <div className="shuttle__info">
            <h3 className="shuttle__name">{name}</h3>
            {desc && <p className="shuttle__desc">{desc}</p>}
          </div>
        </div>
        <div className="shuttle__action">
          <div className="shuttle__timer">
            <svg className="shuttle__ring" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2" />
              <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="100" style={{ strokeDashoffset: 100 - progress }} />
            </svg>
            <span className="shuttle__count">{countdown}</span>
          </div>
          <button className="shuttle__btn" onClick={jump} disabled={jumping}>
            {jumping ? '跳转中...' : '立即前往'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}


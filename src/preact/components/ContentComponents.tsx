import { useState, useEffect } from 'preact/hooks'
import type { FunctionComponent, ComponentChildren } from 'preact'

// ========================================
// Alert 提示框
// ========================================
interface AlertProps {
  type?: 'tip' | 'info' | 'question' | 'warning' | 'error'
  title?: string
  card?: boolean
  gradient?: boolean
  children?: ComponentChildren
}

const alertConfig: Record<string, { icon: string; color: string; title: string }> = {
  tip: { icon: 'icon-[ph--notepad-bold]', color: '#3A7', title: '提醒' },
  info: { icon: 'icon-[ph--info-bold]', color: 'var(--c-text-1)', title: '信息' },
  question: { icon: 'icon-[ph--question-bold]', color: '#3AF', title: '问题' },
  warning: { icon: 'icon-[ph--warning-bold]', color: '#F80', title: '警告' },
  error: { icon: 'icon-[ph--x-circle-bold]', color: '#F33', title: '错误' },
}

export const Alert: FunctionComponent<AlertProps> = ({ type = 'tip', title, card = false, gradient = true, children }) => {
  const config = alertConfig[type] || alertConfig.tip
  const classes = ['c-alert', card ? 'card' : '', gradient ? '' : 'no-gradient'].filter(Boolean).join(' ')
  return (
    <div class={classes} style={{ '--c-primary': config.color } as any}>
      <div class="c-alert-title">
        <span class={config.icon} />
        {title || config.title}
      </div>
      <div class="c-alert-body">{children}</div>
    </div>
  )
}

// ========================================
// Tab 标签页
// ========================================
interface TabProps {
  tabs: string[]
  center?: boolean
  active?: number
  children?: ComponentChildren
}

export const Tab: FunctionComponent<TabProps> = ({ tabs, center, active = 1, children }) => {
  const [activeTab, setActiveTab] = useState(active)
  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div class={center ? 'center' : ''}>
      <div class="c-tabs">
        {tabs.map((tab, i) => (
          <button
            key={i}
            class={activeTab === i + 1 ? 'active' : ''}
            onClick={() => setActiveTab(i + 1)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div class="c-tab-content">
        {childArray.map((child, i) => (
          <div key={i} class={`c-tab-panel ${activeTab === i + 1 ? 'active' : ''}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

// ========================================
// Copy 复制命令
// ========================================
interface CopyProps {
  code: string
  prompt?: string | boolean
}

export const Copy: FunctionComponent<CopyProps> = ({ code, prompt = '$' }) => {
  const [copied, setCopied] = useState(false)
  const showPrompt = prompt !== true && prompt !== ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <code class="c-copy">
      {showPrompt && <span class="c-copy-prompt">{prompt}</span>}
      <div class="c-copy-code">{code}</div>
      <button class="c-copy-btn" onClick={handleCopy} aria-label="复制">
        <span class={copied ? 'icon-[ph--check-bold]' : 'icon-[ph--copy-bold]'} />
      </button>
    </code>
  )
}

// ========================================
// Folding 折叠
// ========================================
interface FoldingProps {
  title?: string
  open?: boolean
  children?: ComponentChildren
}

export const Folding: FunctionComponent<FoldingProps> = ({ title, open, children }) => {
  return (
    <details class="c-folding" open={open}>
      <summary>{title}</summary>
      <div class="c-folding-detail">{children}</div>
    </details>
  )
}

// ========================================
// Tip 提示文本
// ========================================
interface TipProps {
  tip?: string
  children?: ComponentChildren
}

export const Tip: FunctionComponent<TipProps> = ({ tip, children }) => {
  return (
    <span class="c-tip" data-tip={tip}>
      {children}
    </span>
  )
}

// ========================================
// Blur 模糊遮罩
// ========================================
interface BlurProps {
  children?: ComponentChildren
}

export const Blur: FunctionComponent<BlurProps> = ({ children }) => {
  return <span class="c-blur">{children}</span>
}

// ========================================
// Timeline 时间线
// ========================================
interface TimelineItem {
  time: string
  content: string
}

interface TimelineProps {
  items: TimelineItem[]
}

export const Timeline: FunctionComponent<TimelineProps> = ({ items }) => {
  return (
    <dl class="c-timeline">
      {items.map((item, i) => (
        <>
          <dt key={`t${i}`}>{item.time}</dt>
          <dd key={`c${i}`} class="card" dangerouslySetInnerHTML={{ __html: item.content }} />
        </>
      ))}
    </dl>
  )
}

// ========================================
// Quote 引用
// ========================================
interface QuoteProps {
  icon?: string
  children?: ComponentChildren
}

export const Quote: FunctionComponent<QuoteProps> = ({ icon, children }) => {
  return (
    <div class="c-quote title-like">
      <div class="c-quote-icon">
        {icon ? <span>{icon}</span> : <span class="icon-[ph--chat-centered-text-duotone]" />}
      </div>
      <div class="c-quote-content">{children}</div>
    </div>
  )
}

// ========================================
// Chat 聊天
// ========================================
interface ChatItem {
  name: string
  content: string
  self?: boolean
}

interface ChatProps {
  items: ChatItem[]
}

export const Chat: FunctionComponent<ChatProps> = ({ items }) => {
  return (
    <dl class="c-chat">
      {items.map((item, i) => (
        <>
          <dt key={`n${i}`} class={item.self ? 'self' : ''}>{item.name}</dt>
          <dd key={`c${i}`} dangerouslySetInnerHTML={{ __html: item.content }} />
        </>
      ))}
    </dl>
  )
}

// ========================================
// Key 按键
// ========================================
interface KeyProps {
  text?: string
  code?: string
  cmd?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

export const Key: FunctionComponent<KeyProps> = ({ text, code, cmd, ctrl, shift, alt }) => {
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent)
  
  const parts: string[] = []
  if (cmd) parts.push(isMac ? '⌘' : 'Ctrl')
  if (ctrl && !cmd) parts.push(isMac ? '⌃' : 'Ctrl')
  if (shift) parts.push(isMac ? '⇧' : 'Shift')
  if (alt) parts.push(isMac ? '⌥' : 'Alt')
  if (code) parts.push(code)
  
  const display = text || parts.join(isMac ? '' : '+')
  
  return <kbd class="c-key">{display}</kbd>
}


// ========================================
// CardList 卡片列表
// ========================================
interface CardListProps {
  children?: ComponentChildren
}

export const CardList: FunctionComponent<CardListProps> = ({ children }) => {
  return <div class="c-card-list">{children}</div>
}

// ========================================
// Pic 图片
// ========================================
interface PicProps {
  src: string
  caption?: string
  width?: string | number
  height?: string | number
}

export const Pic: FunctionComponent<PicProps> = ({ src, caption, width, height }) => {
  return (
    <figure class="c-pic">
      <img src={src} alt={caption || ''} style={{ width, height }} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}


// ========================================
// Progress 进度条
// ========================================
interface ProgressProps {
  value: number
  max?: number
  color?: string
  label?: string
  showPercent?: boolean
}

export const Progress: FunctionComponent<ProgressProps> = ({ 
  value, 
  max = 100, 
  color,
  label,
  showPercent = true
}) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <div class="c-progress">
      {label && <div class="c-progress-label">{label}</div>}
      <div class="c-progress-bar" style={{ '--c-progress-color': color } as any}>
        <div class="c-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {showPercent && <div class="c-progress-text">{Math.round(percent)}%</div>}
    </div>
  )
}

// ========================================
// EmojiClock 表情时钟
// ========================================
const emojiClockList = ['🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦']

export const EmojiClock: FunctionComponent = () => {
  const [emoji, setEmoji] = useState('🕛')
  
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const idx = now.getHours() * 2 + Math.round(now.getMinutes() / 30)
      setEmoji(emojiClockList[idx % emojiClockList.length])
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])
  
  return <span class="c-emoji-clock">{emoji}</span>
}

// ========================================
// Split 分栏布局
// ========================================
interface SplitProps {
  cols?: number | string
  gap?: string
  children?: ComponentChildren
}

export const Split: FunctionComponent<SplitProps> = ({ cols = 2, gap = '1rem', children }) => {
  const gridCols = typeof cols === 'number' 
    ? `repeat(${cols}, 1fr)` 
    : `repeat(auto-fill, minmax(${cols}, 1fr))`
  
  return (
    <div class="c-split" style={{ gridTemplateColumns: gridCols, gap }}>
      {children}
    </div>
  )
}

// ========================================
// Stepper 步骤
// ========================================
interface StepperItem {
  title: string
  content: string
}

interface StepperProps {
  items: StepperItem[]
}

export const Stepper: FunctionComponent<StepperProps> = ({ items }) => {
  return (
    <ol class="c-stepper">
      {items.map((item, i) => (
        <li key={i} class="c-stepper-item">
          <div class="c-stepper-marker">{i + 1}</div>
          <div class="c-stepper-content">
            <div class="c-stepper-title">{item.title}</div>
            <div class="c-stepper-body" dangerouslySetInnerHTML={{ __html: item.content }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

// ========================================
// Note 便签
// ========================================
interface NoteProps {
  color?: 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
  rotate?: boolean
  children?: ComponentChildren
}

export const Note: FunctionComponent<NoteProps> = ({ color = 'yellow', rotate, children }) => {
  return (
    <div class={`c-note c-note-${color} ${rotate ? 'rotate' : ''}`}>
      {children}
    </div>
  )
}

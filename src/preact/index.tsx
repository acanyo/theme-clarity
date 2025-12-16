import { render } from 'preact'
import { PhotoGallery } from './components/PhotoGallery'
import { Weather } from './components/Weather'
import { Shuttle } from './components/Shuttle'
import {
  Alert, Tab, Copy, Folding, Tip, Blur, Timeline, Quote, 
  Chat, Key, CardList, Pic,
  Progress, EmojiClock, Split, Stepper, Note
} from './components/ContentComponents'

export function mountPhotoGallery(container: HTMLElement, groups: any[]) {
  render(<PhotoGallery groups={groups} />, container)
}

export function mountWeather(container: HTMLElement, apiKey: string, iconBase: string) {
  render(<Weather apiKey={apiKey} iconBase={iconBase} />, container)
}

// ========================================
// 自定义标签名挂载
// ========================================

function parseProps(el: HTMLElement) {
  const props: Record<string, any> = {}
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]
    let value: any = attr.value
    if (value === '' || value === 'true') value = true
    else if (value === 'false') value = false
    else if (!isNaN(Number(value)) && value !== '') value = Number(value)
    props[attr.name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value
  }
  return props
}

// 挂载到新容器，避免内容重复
function mount(el: HTMLElement, component: any) {
  const wrapper = document.createElement('div')
  el.replaceWith(wrapper)
  render(component, wrapper)
}

function mountCustomElements() {
  // c-alert
  document.querySelectorAll<HTMLElement>('c-alert').forEach(el => {
    const props = parseProps(el)
    const content = el.innerHTML
    mount(el, 
      <Alert {...props}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </Alert>
    )
  })

  // c-tab
  document.querySelectorAll<HTMLElement>('c-tab').forEach(el => {
    const props = parseProps(el)
    const tabs = (props.tabs || '').split(',').map((t: string) => t.trim())
    const panels = Array.from(el.querySelectorAll('c-tab-panel')).map(p => p.innerHTML)
    mount(el,
      <Tab tabs={tabs} center={props.center} active={props.active}>
        {panels.map((p, i) => <div key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
      </Tab>
    )
  })

  // c-copy
  document.querySelectorAll<HTMLElement>('c-copy').forEach(el => {
    const props = parseProps(el)
    const code = props.code || el.textContent || ''
    mount(el, <Copy code={code} prompt={props.prompt} />)
  })

  // c-folding
  document.querySelectorAll<HTMLElement>('c-folding').forEach(el => {
    const props = parseProps(el)
    const content = el.innerHTML
    mount(el,
      <Folding title={props.title} open={props.open}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </Folding>
    )
  })

  // c-tip（行内元素用 span）
  document.querySelectorAll<HTMLElement>('c-tip').forEach(el => {
    const props = parseProps(el)
    const content = el.innerHTML
    const wrapper = document.createElement('span')
    el.replaceWith(wrapper)
    render(
      <Tip tip={props.tip}>
        <span dangerouslySetInnerHTML={{ __html: content }} />
      </Tip>,
      wrapper
    )
  })

  // c-blur（行内元素）
  document.querySelectorAll<HTMLElement>('c-blur').forEach(el => {
    const content = el.innerHTML
    const wrapper = document.createElement('span')
    el.replaceWith(wrapper)
    render(
      <Blur>
        <span dangerouslySetInnerHTML={{ __html: content }} />
      </Blur>,
      wrapper
    )
  })

  // c-timeline（使用 c-timeline-item 子元素）
  document.querySelectorAll<HTMLElement>('c-timeline').forEach(el => {
    const items = Array.from(el.querySelectorAll('c-timeline-item')).map(item => ({
      time: item.getAttribute('time') || '',
      content: item.innerHTML
    }))
    mount(el, <Timeline items={items} />)
  })

  // c-quote
  document.querySelectorAll<HTMLElement>('c-quote').forEach(el => {
    const props = parseProps(el)
    const content = el.innerHTML
    mount(el,
      <Quote icon={props.icon}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </Quote>
    )
  })

  // c-chat（使用 c-chat-item 子元素）
  document.querySelectorAll<HTMLElement>('c-chat').forEach(el => {
    const items = Array.from(el.querySelectorAll('c-chat-item')).map(item => ({
      name: item.getAttribute('name') || '',
      content: item.innerHTML,
      self: item.hasAttribute('self')
    }))
    mount(el, <Chat items={items} />)
  })

  // c-key（行内元素）
  document.querySelectorAll<HTMLElement>('c-key').forEach(el => {
    const props = parseProps(el)
    const wrapper = document.createElement('span')
    el.replaceWith(wrapper)
    render(<Key {...props} />, wrapper)
  })

  // c-card-list
  document.querySelectorAll<HTMLElement>('c-card-list').forEach(el => {
    const content = el.innerHTML
    mount(el,
      <CardList>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </CardList>
    )
  })

  // c-pic
  document.querySelectorAll<HTMLElement>('c-pic').forEach(el => {
    const props = parseProps(el)
    mount(el, <Pic src={props.src} caption={props.caption} width={props.width} height={props.height} />)
  })


  // c-progress
  document.querySelectorAll<HTMLElement>('c-progress').forEach(el => {
    const props = parseProps(el)
    mount(el, 
      <Progress 
        value={props.value} 
        max={props.max} 
        color={props.color} 
        label={props.label}
        showPercent={props.showPercent !== false}
      />
    )
  })

  // c-emoji-clock (inline)
  document.querySelectorAll<HTMLElement>('c-emoji-clock').forEach(el => {
    const wrapper = document.createElement('span')
    el.replaceWith(wrapper)
    render(<EmojiClock />, wrapper)
  })

  // c-split
  document.querySelectorAll<HTMLElement>('c-split').forEach(el => {
    const props = parseProps(el)
    const children = Array.from(el.children).map((child, i) => (
      <div key={i} dangerouslySetInnerHTML={{ __html: child.innerHTML }} />
    ))
    mount(el,
      <Split cols={props.cols} gap={props.gap}>
        {children}
      </Split>
    )
  })

  // c-stepper
  document.querySelectorAll<HTMLElement>('c-stepper').forEach(el => {
    const items = Array.from(el.querySelectorAll('c-step')).map(item => ({
      title: item.getAttribute('title') || '',
      content: item.innerHTML
    }))
    mount(el, <Stepper items={items} />)
  })

  // c-note
  document.querySelectorAll<HTMLElement>('c-note').forEach(el => {
    const props = parseProps(el)
    const content = el.innerHTML
    mount(el,
      <Note color={props.color} rotate={props.rotate}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </Note>
    )
  })
}

// 页面加载后自动挂载
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCustomElements)
  } else {
    mountCustomElements()
  }
}

export { mountCustomElements }

// ========================================
// 穿梭组件全局挂载
// ========================================
interface ShuttleOptions {
  url: string
  name: string
  logo?: string
  desc?: string
}

let shuttleRoot: HTMLElement | null = null

function openShuttle(options: ShuttleOptions) {
  if (shuttleRoot) return

  shuttleRoot = document.createElement('div')
  shuttleRoot.id = 'shuttle-root'
  document.body.appendChild(shuttleRoot)
  document.body.style.overflow = 'hidden'

  const close = () => {
    if (shuttleRoot) {
      render(null, shuttleRoot)
      shuttleRoot.remove()
      shuttleRoot = null
      document.body.style.overflow = ''
    }
  }

  render(<Shuttle {...options} onClose={close} />, shuttleRoot)
}

// 挂载到 window 供全局调用
if (typeof window !== 'undefined') {
  (window as any).openShuttle = openShuttle
}

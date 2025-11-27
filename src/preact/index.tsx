import { render } from 'preact'
import { Counter } from './components/Counter'

export function mountCounter(container: HTMLElement) {
  render(<Counter />, container)
}
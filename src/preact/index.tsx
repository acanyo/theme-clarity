import { render } from 'preact'
import { PhotoGallery } from './components/PhotoGallery'

export function mountPhotoGallery(container: HTMLElement, groups: any[]) {
  render(<PhotoGallery groups={groups} />, container)
}
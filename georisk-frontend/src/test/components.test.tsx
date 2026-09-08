import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, EmptyState } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'

describe('Skeleton', () => {
  it('renders without crashing', () => {
    render(<Skeleton />)
    const container = document.querySelector('.skeleton-card, .skeleton, [class*="skeleton"]')
    expect(container).toBeTruthy()
  })

  it('renders with lines prop', () => {
    const { container } = render(<Skeleton lines={5} />)
    const textLines = container.querySelectorAll('.skeleton-text, .skeleton-text-short')
    expect(textLines.length).toBe(5)
  })

  it('renders short variant', () => {
    const { container } = render(<Skeleton lines={2} short />)
    const shortLines = container.querySelectorAll('.skeleton-text-short')
    expect(shortLines.length).toBe(2)
  })

  it('renders card variant', () => {
    const { container } = render(<Skeleton card />)
    const card = container.querySelector('.skeleton-card')
    expect(card).toBeTruthy()
  })
})

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No data" />)
    expect(screen.getByText('No data')).toBeTruthy()
  })

  it('renders with description', () => {
    render(<EmptyState title="Empty" description="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })

  it('renders custom icon', () => {
    render(<EmptyState icon="⚠️" title="Warning" />)
    expect(screen.getByText('⚠️')).toBeTruthy()
  })
})

describe('Badge', () => {
  it('renders verde level', () => {
    render(<Badge nivel="verde" />)
    const badge = screen.getByText('VERDE')
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('badge-verde')
  })

  it('renders naranja level', () => {
    render(<Badge nivel="naranja" />)
    expect(screen.getByText('NARANJA').className).toContain('badge-naranja')
  })

  it('renders rojo level', () => {
    render(<Badge nivel="rojo" />)
    expect(screen.getByText('ROJO').className).toContain('badge-rojo')
  })

  it('renders Bajo as verde', () => {
    render(<Badge nivel="Bajo" />)
    expect(screen.getByText('BAJO').className).toContain('badge-verde')
  })

  it('renders Medio as naranja', () => {
    render(<Badge nivel="Medio" />)
    expect(screen.getByText('MEDIO').className).toContain('badge-naranja')
  })

  it('renders Alto as rojo', () => {
    render(<Badge nivel="Alto" />)
    expect(screen.getByText('ALTO').className).toContain('badge-rojo')
  })

  it('renders unknown level as gris', () => {
    render(<Badge nivel="unknown" />)
    expect(screen.getByText('UNKNOWN').className).toContain('badge-gris')
  })
})

import React, { useRef, useEffect, useCallback, useReducer } from 'react'
import type { SystemBody } from '@shared/types'
import {
  orbitalToCartesian,
  auToCanvas,
  type ViewportState,
  type CartesianPoint
} from '../../lib/orbital-math'

interface SystemMapCanvasProps {
  bodies: SystemBody[]
  width: number
  height: number
}

type ViewportAction =
  | { type: 'zoom'; delta: number; mouseX: number; mouseY: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'resize'; width: number; height: number }
  | { type: 'reset'; width: number; height: number }

// BodyTypeID values that get orbits drawn
const ORBIT_BODY_TYPES = new Set([1, 2, 4, 5, 10])
const KM_PER_AU = 149_597_870.7
const MOON_ZOOM_THRESHOLD = 15000 // px/AU - moons only visible past this

function viewportReducer(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.type) {
    case 'zoom': {
      const factor = action.delta > 0 ? 0.85 : 1.18
      const newScale = Math.max(0.001, Math.min(state.scale * factor, 1e8))
      const mouseAuX = (action.mouseX - state.canvasWidth / 2) / state.scale + state.centerX
      const mouseAuY = (action.mouseY - state.canvasHeight / 2) / state.scale + state.centerY
      const newCenterX = mouseAuX - (action.mouseX - state.canvasWidth / 2) / newScale
      const newCenterY = mouseAuY - (action.mouseY - state.canvasHeight / 2) / newScale
      return { ...state, scale: newScale, centerX: newCenterX, centerY: newCenterY }
    }
    case 'pan':
      return {
        ...state,
        centerX: state.centerX - action.dx / state.scale,
        centerY: state.centerY - action.dy / state.scale
      }
    case 'resize':
      return { ...state, canvasWidth: action.width, canvasHeight: action.height }
    case 'reset':
      return {
        centerX: 0,
        centerY: 0,
        scale: 100,
        canvasWidth: action.width,
        canvasHeight: action.height
      }
  }
}

export function SystemMapCanvas({
  bodies,
  width,
  height
}: SystemMapCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)

  const positions = useRef(new Map<number, CartesianPoint>())

  const [viewport, dispatch] = useReducer(viewportReducer, {
    centerX: 0,
    centerY: 0,
    scale: 100,
    canvasWidth: width,
    canvasHeight: height
  })

  useEffect(() => {
    dispatch({ type: 'resize', width, height })
  }, [width, height])

  // Update positions directly from data
  useEffect(() => {
    const newPositions = new Map<number, CartesianPoint>()
    for (const body of bodies) {
      newPositions.set(body.SystemBodyID, {
        x: body.Xcor / KM_PER_AU,
        y: body.Ycor / KM_PER_AU
      })
    }
    positions.current = newPositions
  }, [bodies])

  // Set canvas size only when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
  }, [width, height])

  // Render loop at 60fps with smooth animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw(): void {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Use real positions directly - no interpolation
      const posMap = positions.current

      // Background
      ctx.fillStyle = '#08080f'
      ctx.fillRect(0, 0, width, height)

      // Star at center
      const starScreen = auToCanvas({ x: 0, y: 0 }, viewport)
      ctx.beginPath()
      ctx.arc(starScreen.cx, starScreen.cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd700'
      ctx.fill()
      ctx.fillStyle = '#ffd700'
      ctx.font = '11px monospace'
      ctx.fillText('Star', starScreen.cx + 10, starScreen.cy + 4)

      const showMoons = viewport.scale >= MOON_ZOOM_THRESHOLD

      const planetByNumber = new Map<number, SystemBody>()
      for (const body of bodies) {
        if (body.OrbitNumber === 0 && body.PlanetNumber > 0) {
          planetByNumber.set(body.PlanetNumber, body)
        }
      }

      // Draw orbits (elliptical using Eccentricity)
      for (const body of bodies) {
        if (!ORBIT_BODY_TYPES.has(body.BodyTypeID)) continue
        if (body.OrbitNumber > 0 && !showMoons) continue

        if (body.OrbitNumber === 0) {
          const a = body.OrbitalDistance // semi-major axis in AU
          const e = body.Eccentricity || 0
          const b = a * Math.sqrt(1 - e * e) // semi-minor axis
          const c = a * e // distance from center to focus (star)

          const semiMajorPx = a * viewport.scale
          const semiMinorPx = b * viewport.scale

          if (semiMajorPx > 2 && semiMajorPx < width * 3) {
            // EccentricityDirection is the angle of periapsis from the star
            // The ellipse center is offset from the star (focus) by c along that direction
            const dirRad = ((body.EccentricityDirection || 0) * Math.PI) / 180
            const offsetPx = c * viewport.scale

            // Ellipse center = star + offset along eccentricity direction
            // Using same coordinate system as body positions (cos for x, y direct)
            const ellipseCx = starScreen.cx + Math.cos(dirRad) * offsetPx
            const ellipseCy = starScreen.cy + Math.sin(dirRad) * offsetPx

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(ellipseCx, ellipseCy, semiMajorPx, semiMinorPx, dirRad, 0, Math.PI * 2)
            ctx.stroke()
          }
        } else {
          const parent = planetByNumber.get(body.PlanetNumber)
          if (parent) {
            const parentPos = posMap.get(parent.SystemBodyID)
            if (parentPos) {
              const parentScreen = auToCanvas(parentPos, viewport)
              const moonOrbitRadius = (body.DistanceToParent / KM_PER_AU) * viewport.scale
              if (moonOrbitRadius > 1 && moonOrbitRadius < width * 2) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.arc(parentScreen.cx, parentScreen.cy, moonOrbitRadius, 0, Math.PI * 2)
                ctx.stroke()
              }
            }
          }
        }
      }

      // Draw bodies
      for (const body of bodies) {
        if (body.OrbitNumber > 0 && !showMoons) continue

        const pos = posMap.get(body.SystemBodyID)
        if (!pos) continue

        const screen = auToCanvas(pos, viewport)
        if (screen.cx < -50 || screen.cx > width + 50 || screen.cy < -50 || screen.cy > height + 50)
          continue

        const moon = body.OrbitNumber > 0
        const radius = moon ? 2.5 : 4
        const color = getBodyColor(body.BodyClass)

        ctx.beginPath()
        ctx.arc(screen.cx, screen.cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.font = moon ? '9px monospace' : '10px monospace'
        ctx.fillText(body.Name || `Body ${body.SystemBodyID}`, screen.cx + radius + 4, screen.cy + 3)
      }

      // HUD
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = '10px monospace'
      ctx.fillText(`Scale: ${formatScale(viewport.scale)}`, 10, height - 10)
      ctx.fillText(`Bodies: ${bodies.length}`, 10, height - 24)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [bodies, viewport, width, height])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    dispatch({ type: 'pan', dx, dy })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    dispatch({
      type: 'zoom',
      delta: e.deltaY,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top
    })
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  )
}

function getBodyColor(bodyClass: number): string {
  switch (bodyClass) {
    case 1:
      return '#4a9eff' // Terrestrial
    case 2:
      return '#ff6b35' // Gas Giant
    case 3:
      return '#8b5cf6' // Ice Giant
    case 4:
      return '#6b7280' // Asteroid
    case 5:
      return '#94a3b8' // Dwarf Planet
    case 6:
      return '#fbbf24' // Super-Jovian
    case 7:
      return '#ef4444' // Comet
    default:
      return '#9ca3af'
  }
}

function formatScale(scale: number): string {
  if (scale >= 1e6) return `${(scale / 1e6).toFixed(1)}M px/AU`
  if (scale >= 1e3) return `${(scale / 1e3).toFixed(1)}K px/AU`
  return `${scale.toFixed(1)} px/AU`
}

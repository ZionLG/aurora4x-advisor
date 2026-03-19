export interface CartesianPoint {
  x: number
  y: number
}

export interface ViewportState {
  centerX: number // AU
  centerY: number // AU
  scale: number // pixels per AU
  canvasWidth: number
  canvasHeight: number
}

/**
 * Convert orbital parameters to Cartesian coordinates.
 * OrbitalDistance is in AU, Bearing is in degrees (0-360).
 */
export function orbitalToCartesian(
  orbitalDistance: number,
  bearingDegrees: number
): CartesianPoint {
  const bearingRadians = (bearingDegrees * Math.PI) / 180
  return {
    x: orbitalDistance * Math.sin(bearingRadians),
    y: -orbitalDistance * Math.cos(bearingRadians)
  }
}

/**
 * Convert AU coordinates to canvas pixel coordinates given viewport state.
 */
export function auToCanvas(
  point: CartesianPoint,
  viewport: ViewportState
): { cx: number; cy: number } {
  return {
    cx: (point.x - viewport.centerX) * viewport.scale + viewport.canvasWidth / 2,
    cy: (point.y - viewport.centerY) * viewport.scale + viewport.canvasHeight / 2
  }
}

/**
 * Convert canvas pixel coordinates back to AU coordinates.
 */
export function canvasToAu(cx: number, cy: number, viewport: ViewportState): CartesianPoint {
  return {
    x: (cx - viewport.canvasWidth / 2) / viewport.scale + viewport.centerX,
    y: (cy - viewport.canvasHeight / 2) / viewport.scale + viewport.centerY
  }
}

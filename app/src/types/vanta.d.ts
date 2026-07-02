declare module "vanta/dist/vanta.net.min" {
  interface VantaNetOptions {
    el: HTMLElement
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
    scale?: number
    scaleMobile?: number
    color?: number
    backgroundColor?: number
    points?: number
    maxDistance?: number
    spacing?: number
    showDots?: boolean
  }
  interface VantaNetInstance {
    destroy: () => void
    points?: Array<{ scale: { set: (x: number, y: number, z: number) => void }; r: number }>
  }
  function NET(options: VantaNetOptions): VantaNetInstance
  export default NET
}

declare module "vanta/dist/vanta.dots.min" {
  interface VantaDotsOptions {
    el: HTMLElement
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
    scale?: number
    scaleMobile?: number
    color?: number
    backgroundColor?: number
    size?: number
    spacing?: number
    showLines?: boolean
  }
  interface VantaDotsInstance {
    destroy: () => void
  }
  function DOTS(options: VantaDotsOptions): VantaDotsInstance
  export default DOTS
}

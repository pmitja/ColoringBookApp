export interface EditorTextBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  richText?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  fontColor?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  holderShape?: 'none' | 'rounded' | 'pill' | 'blob-soft' | 'blob-playful' | 'blob-organic'
  boxShadow?: string
  padding?: number
  chatBubble?: {
    trianglePosition: 'top' | 'right' | 'bottom' | 'left'
    triangleOffset: number // percentage from edge (0-100)
    triangleSize: number // size of triangle in pixels
  }
}

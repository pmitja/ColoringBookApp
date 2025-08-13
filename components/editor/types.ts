export interface EditorTextBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  fontColor?: string
}



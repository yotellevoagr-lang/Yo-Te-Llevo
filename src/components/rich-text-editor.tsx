"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { Underline } from '@tiptap/extension-underline'
import { useEffect, useRef, useCallback } from 'react'
import { Bold, Underline as UnderlineIcon, Palette, RemoveFormatting } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const COLORS = [
  { label: 'Negro', value: '#000000' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Gris', value: '#6b7280' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Primario', value: 'hsl(var(--primary))' },
  { label: 'Mutado', value: 'hsl(var(--muted-foreground))' },
]

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minRows?: number
}

export function RichTextEditor({ value, onChange, placeholder, className, minRows = 2 }: RichTextEditorProps) {
  const onChangeFn = useRef(onChange)
  onChangeFn.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false }),
      TextStyle,
      Color,
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const empty = editor.isEmpty ? html === '<p></p>' : false
      onChangeFn.current(empty ? '' : html)
    },
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          `min-h-[${minRows * 28}px]`
        ),
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value && value !== undefined) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1 p-1 border border-input rounded-t-md bg-muted/50 -mb-[1px] z-10 relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor.isActive('bold') && 'bg-accent')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', editor.isActive('underline') && 'bg-accent')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Color de texto"
            >
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">Color de texto</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ background: color.value }}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Sin color
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Quitar formato"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </Button>
      </div>
      <EditorContent editor={editor} />
      {!editor.getText() && placeholder && (
        <p className="text-xs text-muted-foreground pl-1 pointer-events-none">{placeholder}</p>
      )}
    </div>
  )
}

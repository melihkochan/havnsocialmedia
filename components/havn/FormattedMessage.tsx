import { splitMessageParts, getFlagImageUrl } from '@/lib/flags'
import { cn } from '@/lib/utils'

interface FormattedMessageProps {
  text: string
  className?: string
}

/** Metin + bayrak emojilerini (Windows uyumlu görsellerle) render eder */
export function FormattedMessage({ text, className }: FormattedMessageProps) {
  const parts = splitMessageParts(text)

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.value}</span>
        }
        return (
          <img
            key={i}
            src={getFlagImageUrl(part.iso, 40)}
            alt={part.iso.toUpperCase()}
            title={part.iso.toUpperCase()}
            width={22}
            height={16}
            className="inline-block rounded-[2px] object-cover align-[-3px] mx-0.5 shadow-sm ring-1 ring-border/40"
            loading="lazy"
            decoding="async"
          />
        )
      })}
    </span>
  )
}

export function insertIntoField(
  value: string,
  setValue: (next: string) => void,
  element: HTMLInputElement | HTMLTextAreaElement | null,
  insert: string
) {
  if (!element) {
    setValue(value + insert)
    return
  }

  const start = element.selectionStart ?? value.length
  const end = element.selectionEnd ?? value.length
  const next = value.slice(0, start) + insert + value.slice(end)
  setValue(next)

  requestAnimationFrame(() => {
    element.focus()
    const pos = start + insert.length
    element.setSelectionRange(pos, pos)
  })
}

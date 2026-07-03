export function normalizeMarkdown(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart()
      const pipeCount = (line.match(/\|/g) ?? []).length

      if (pipeCount < 3) {
        return line
      }

      if (trimmed.startsWith('|') || trimmed.includes('| |')) {
        return line.replace(/\|\s+\|/g, '|\n|')
      }

      return line
    })
    .join('\n')
}

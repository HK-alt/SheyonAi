/** Strip LaTeX delimiters and commands so sidebar titles stay readable. */
export function displayChatTitle(title: string): string {
  const stripped = title
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || 'New chat';
}

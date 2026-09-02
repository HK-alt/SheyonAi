export type AnatomyVendorScripts = {
  three: string;
  loader: string;
};

export async function fetchVendorText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read anatomy vendor script (${response.status}).`);
  }
  return response.text();
}

export function wrapInlineScript(code: string): string {
  return `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
}

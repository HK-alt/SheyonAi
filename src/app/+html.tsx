import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <ScrollViewStyleReset />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: documentBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const documentBackground = `
html, body, #root {
  height: 100%;
}
@supports (height: 100dvh) {
  html, body, #root {
    height: 100dvh;
  }
}
body {
  background-color: #F7F6F3;
  overscroll-behavior-y: none;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1C1B1A;
  }
}
`;

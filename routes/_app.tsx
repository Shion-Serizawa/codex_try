import { AppProps } from "fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BBS</title>
      </head>
      <body class="p-4 max-w-4xl mx-auto">
        <header class="mb-6">
          <a href="/" class="text-2xl font-bold">BBS</a>
        </header>
        <Component />
      </body>
    </html>
  );
}


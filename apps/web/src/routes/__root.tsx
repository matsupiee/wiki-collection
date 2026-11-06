import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Wiki Collection" },
      {
        name: "description",
        content: "Wikipedia の記事をカードにして集めるトレーディングカードアプリ",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="text-slate-800 antialiased">
        <div className="min-h-svh [container-type:inline-size]">
          <div className="mx-auto min-h-svh max-w-md">
            <Outlet />
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

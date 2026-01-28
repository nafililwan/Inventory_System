import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/providers/ToastProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR Store Inventory Management System",
  description: "Jabil Malaysia HR Store Inventory System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HR Inventory",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="next-head-count" content="0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Fix URL normalization for receiving page - must run before React
              (function() {
                if (typeof window !== 'undefined') {
                  // Normalize any receiving URLs with spaces in query parameters
                  var pathname = window.location.pathname;
                  if (pathname === '/receiving' || pathname === '/receiving/') {
                    var url = new URL(window.location);
                    var status = url.searchParams.get('status');
                    if (status && status.includes(' ')) {
                      var normalizedStatus = status.replace(/\\s+/g, '_');
                      url.searchParams.set('status', normalizedStatus);
                      window.history.replaceState({}, '', url.pathname + url.search);
                    }
                  }
                  
                  // Prevent Next.js from prefetching URLs with query parameters
                  if (typeof window.next !== 'undefined') {
                    var originalPrefetch = window.next.router?.prefetch;
                    if (originalPrefetch) {
                      window.next.router.prefetch = function(href) {
                        if (href && href.includes('?')) {
                          return Promise.resolve();
                        }
                        return originalPrefetch.call(this, href);
                      };
                    }
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
        <ToastProvider />
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

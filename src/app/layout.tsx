import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "TrackerParse",
  description: "Music tracker for artist discographies",
};

// Improve mobile scaling by explicitly defining viewport properties
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    // Use saved preference
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } else {
                    // Use system preference and save it
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var systemTheme = prefersDark ? 'dark' : 'light';
                    localStorage.setItem('theme', systemTheme);
                    if (systemTheme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 text-gray-900 dark:text-white transition-all duration-300">
        <ThemeProvider>
          <Navigation />
          <main className="pt-16 pb-24 min-h-[calc(100vh-4rem)] px-2 sm:px-4">
            {children}
            
            {/* Page Footer - at bottom of content, not fixed */}
            <footer className="mt-16 py-8 border-t border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                  <span>Built with ❤️ for the music tracking community • </span>
                  <a 
                    href="https://github.com/safkom/TrackerParse" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ml-1"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </footer>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

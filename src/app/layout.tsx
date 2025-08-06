import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force dark mode always
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                } catch (e) {
                  // Fallback to dark mode
                  document.documentElement.classList.add('dark');
                }
                
                // Handle browser extension runtime errors
                window.addEventListener('error', function(e) {
                  if (e.message && e.message.includes('runtime.sendMessage')) {
                    e.preventDefault();
                    console.warn('Browser extension API call blocked by CSP');
                    return false;
                  }
                });
                
                // Handle unhandled promise rejections from extensions
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && e.reason.message && e.reason.message.includes('runtime')) {
                    e.preventDefault();
                    console.warn('Browser extension promise rejection handled');
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100 transition-all duration-300">
        <Navigation />
        <main className="pt-16 pb-24 min-h-[calc(100vh-4rem)] px-2 sm:px-4 bg-slate-900">
          {children}
          
          {/* Page Footer - at bottom of content, not fixed */}
          <footer className="mt-16 py-8 border-t border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center text-sm text-slate-400">
                <span>Built with ❤️ for the music tracking community • </span>
                <a 
                  href="https://github.com/safkom/TrackerParse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}

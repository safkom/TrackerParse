'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecentTracks() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page for now, as the recent tracks functionality 
    // would be handled by the sheet navigation component
    router.push('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to recent tracks...</p>
      </div>
    </div>
  );
}

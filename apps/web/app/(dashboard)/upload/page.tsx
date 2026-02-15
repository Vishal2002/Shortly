// apps/web/app/(dashboard)/upload/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCreateJob } from '@/hooks/useJobs';

export default function UploadPage() {
  const router = useRouter();
  const { token } = useAuth();
  const createJob = useCreateJob();
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [clipCount, setClipCount] = useState(5);
  const [minDuration, setMinDuration] = useState(15);
  const [maxDuration, setMaxDuration] = useState(60);

  if (!token) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createJob.mutateAsync({
        youtubeUrl,
        options: {
          clipCount,
          minDuration,
          maxDuration,
          addSubtitles: true,
          autoUpload: false,
        },
      });
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
              <p className="text-gray-600 mt-2">
                Paste a YouTube URL to generate viral shorts
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* YouTube URL */}
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  We'll automatically detect the best moments and create viral clips
                </p>
              </div>

              {/* Clip Count */}
              <div>
                <label htmlFor="clipCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Clips
                </label>
                <input
                  id="clipCount"
                  type="number"
                  min="1"
                  max="20"
                  value={clipCount}
                  onChange={(e) => setClipCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of clips to generate (1-20)
                </p>
              </div>

              {/* Duration Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="minDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Min Duration (seconds)
                  </label>
                  <input
                    id="minDuration"
                    type="number"
                    min="10"
                    max="120"
                    value={minDuration}
                    onChange={(e) => setMinDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="maxDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Duration (seconds)
                  </label>
                  <input
                    id="maxDuration"
                    type="number"
                    min="15"
                    max="180"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Features Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  What you'll get:
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>✓ AI-powered viral moment detection</li>
                  <li>✓ 9:16 vertical format (TikTok/Reels/Shorts ready)</li>
                  <li>✓ Hormozi-style captions with emojis 🔥</li>
                  <li>✓ Auto-generated thumbnails</li>
                  <li>✓ Ready to download and post</li>
                </ul>
              </div>

              {/* Error Display */}
              {createJob.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {createJob.error.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createJob.isPending}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                {createJob.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Start Processing'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Processing typically takes 2-5 minutes depending on video length
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
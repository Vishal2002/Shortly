// apps/web/app/(dashboard)/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';

export default function DashboardPage() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const { data: jobs, isLoading, error } = useJobs();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Shortly</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Video
            </Link>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Videos</h2>
            <p className="text-gray-600 mt-1">
              {jobs?.length || 0} video{jobs?.length !== 1 ? 's' : ''} processed
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600 mt-4">Loading your videos...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load videos: {error.message}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && jobs?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload your first YouTube video to get started!
            </p>
            <Link
              href="/upload"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Upload Video
            </Link>
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && jobs && jobs.length > 0 && (
          <div className="grid gap-4">
            {jobs.map((job: any) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {job.video?.title || job.youtubeUrl}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {job.currentStep || 'Processing...'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : job.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                  <span>
                    Created {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  {job.video?.clips && (
                    <span>• {job.video.clips.length} clips</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
// apps/web/app/(dashboard)/jobs/[id]/page.tsx
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useJob } from '@/hooks/useJobs';

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useAuth();
  const { data: job, isLoading, error } = useJob(id);

  if (!token) {
    router.push('/login');
    return null;
  }

  const clips = job?.video?.clips || [];
  const segments = job?.video?.segments || [];

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
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600 mt-4">Loading job details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load job: {error.message}
          </div>
        )}

        {/* Job Details */}
        {job && (
          <div>
            {/* Job Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {job.video?.title || 'Processing Video...'}
                  </h1>
                  <p className="text-gray-600">{job.youtubeUrl}</p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
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

              {/* Progress */}
              {job.status !== 'completed' && job.status !== 'failed' && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{job.currentStep || 'Processing...'}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This usually takes 2-5 minutes. Page will auto-refresh.
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-gray-600 mt-4 pt-4 border-t">
                <span>
                  Created {new Date(job.createdAt).toLocaleString()}
                </span>
                {job.video?.duration && (
                  <span>• Duration: {Math.floor(job.video.duration / 60)}m {job.video.duration % 60}s</span>
                )}
                {segments.length > 0 && (
                  <span>• {segments.length} segments detected</span>
                )}
              </div>
            </div>

            {/* Clips Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Generated Clips ({clips.length})
              </h2>

              {/* Empty State */}
              {clips.length === 0 && job.status === 'completed' && (
                <div className="bg-white rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📹</div>
                  <p className="text-gray-600">No clips generated for this video</p>
                </div>
              )}

              {clips.length === 0 && job.status !== 'completed' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                  <p className="text-blue-800 font-medium">
                    Generating clips with Hormozi-style captions...
                  </p>
                </div>
              )}

              {/* Clips Grid */}
              {clips.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clips.map((clip: any) => (
                    <div key={clip.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Thumbnail */}
                      {clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title}
                          className="w-full aspect-[9/16] object-cover bg-gray-200"
                        />
                      ) : (
                        <div className="w-full aspect-[9/16] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-4xl">🎬</span>
                        </div>
                      )}

                      {/* Clip Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {clip.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {clip.description}
                        </p>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              clip.status === 'ready_for_review'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {clip.status.replace(/_/g, ' ')}
                          </span>
                          {clip.segment?.hasCaptions && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              🔥 Captions
                            </span>
                          )}
                        </div>

                        {/* Download Button */}
                        <button
                          onClick={() => {
                            // For now, just log - we'll add download endpoint later
                            console.log('Download clip:', clip.id);
                            alert('Download feature coming soon! (Need to add /clips/:id/download endpoint)');
                          }}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium text-sm"
                        >
                          Download Clip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
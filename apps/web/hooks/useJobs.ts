// apps/web/hooks/useJobs.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.getJobs(),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id),
    enabled: !!id,
    refetchInterval: (data) => {
      // Auto-refresh every 3 seconds if job is processing
      //@ts-ignore
      if (data?.status === 'processing' || data?.status === 'queued') {
        return 3000;
      }
      return false;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ youtubeUrl, options }: { youtubeUrl: string; options?: any }) =>
      api.createJob(youtubeUrl, options),
    onSuccess: () => {
      // Invalidate jobs list to refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
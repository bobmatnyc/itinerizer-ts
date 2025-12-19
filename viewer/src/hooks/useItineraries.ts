import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useItineraries() {
  return useQuery({
    queryKey: ['itineraries'],
    queryFn: () => apiClient.getItineraries(),
  });
}

export function useItinerary(id: string | undefined) {
  return useQuery({
    queryKey: ['itineraries', id],
    queryFn: () => apiClient.getItinerary(id!),
    enabled: !!id,
  });
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
  });
}

export function useImportPDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, model }: { file: File; model?: string }) =>
      apiClient.importPDF(file, model),
    onSuccess: () => {
      // Invalidate itineraries query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

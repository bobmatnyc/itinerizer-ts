import axios from 'axios';
import type { Itinerary, ItineraryListItem, ModelConfig } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Get all itineraries
  async getItineraries(): Promise<ItineraryListItem[]> {
    const response = await api.get<ItineraryListItem[]>('/itineraries');
    return response.data;
  },

  // Get single itinerary
  async getItinerary(id: string): Promise<Itinerary> {
    const response = await api.get<Itinerary>(`/itineraries/${id}`);
    return response.data;
  },

  // Get available models
  async getModels(): Promise<ModelConfig[]> {
    const response = await api.get<ModelConfig[]>('/models');
    return response.data;
  },

  // Import PDF
  async importPDF(file: File, model?: string): Promise<{
    success: boolean;
    itinerary: Itinerary;
    usage: {
      model: string;
      inputTokens: number;
      outputTokens: number;
      costUSD: number;
    };
    continuityValidation?: {
      valid: boolean;
      gaps: unknown[];
      segmentCount: number;
      summary: string;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (model) {
      formData.append('model', model);
    }

    const response = await api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get cost summary
  async getCosts(): Promise<unknown> {
    const response = await api.get('/costs');
    return response.data;
  },
};

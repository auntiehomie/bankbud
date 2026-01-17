import { create } from 'zustand';
import { BankRate, UserPreferences, AIRecommendation } from '../types';

interface AppState {
  rates: BankRate[];
  filteredRates: BankRate[];
  preferences: UserPreferences | null;
  recommendations: AIRecommendation[];
  loading: boolean;
  error: string | null;
  
  setRates: (rates: BankRate[]) => void;
  setFilteredRates: (rates: BankRate[]) => void;
  setPreferences: (preferences: UserPreferences) => void;
  setRecommendations: (recommendations: AIRecommendation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  rates: [],
  filteredRates: [],
  preferences: null,
  recommendations: [],
  loading: false,
  error: null,
  
  setRates: (rates) => set({ rates, filteredRates: rates }),
  setFilteredRates: (filteredRates) => set({ filteredRates }),
  setPreferences: (preferences) => set({ preferences }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

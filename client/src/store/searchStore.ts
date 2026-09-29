import { create } from 'zustand';

interface SearchState {
  query: string;
  sort: 'date' | 'name';
  order: 'asc' | 'desc';
  type: 'all' | 'project' | 'essay';
  setQuery: (query: string) => void;
  setSort: (sort: 'date' | 'name') => void;
  setOrder: (order: 'asc' | 'desc') => void;
  setType: (type: 'all' | 'project' | 'essay') => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  sort: 'date',
  order: 'desc',
  type: 'all',
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  setOrder: (order) => set({ order }),
  setType: (type) => set({ type }),
  reset: () => set({ query: '', sort: 'date', order: 'desc', type: 'all' }),
}));


export type CatalogCategory = 'MOVIE' | 'SHOW';

export interface CatalogItem {
  ref: string;
  category: CatalogCategory;
  title: string;
  description: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genre: string | null;
}

export interface CatalogResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  source: 'tmdb' | 'fallback' | 'local';
}

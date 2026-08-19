import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FALLBACK_MOVIES } from './data/movies';
import { SHOWS } from './data/shows';
import {
  CatalogCategory,
  CatalogItem,
  CatalogResult,
} from './catalog.types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
  genre_ids: number[];
}

interface CacheEntry {
  value: CatalogResult;
  expiresAt: number;
}

const GENRE_NAMES: Record<number, string> = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção Científica',
  53: 'Thriller',
  10752: 'Guerra',
  37: 'Faroeste',
};

@Injectable()
export class CatalogService {
  private cache = new Map<string, CacheEntry>();

  constructor(private config: ConfigService) {}

  async find(
    category: CatalogCategory,
    search?: string,
    page = 1,
  ): Promise<CatalogResult> {
    if (category === 'SHOW') return this.findShows(search);
    return this.findMovies(search, page);
  }

  private findShows(search?: string): CatalogResult {
    const term = search?.trim().toLowerCase();
    const items = term
      ? SHOWS.filter(
          (s) =>
            s.title.toLowerCase().includes(term) ||
            (s.genre ?? '').toLowerCase().includes(term),
        )
      : SHOWS;

    return { items, page: 1, totalPages: 1, source: 'local' };
  }

  private async findMovies(search?: string, page = 1): Promise<CatalogResult> {
    const apiKey = this.config.get<string>('TMDB_API_KEY');
    if (!apiKey) {
      const term = search?.trim().toLowerCase();
      const items = term
        ? FALLBACK_MOVIES.filter((m) => m.title.toLowerCase().includes(term))
        : FALLBACK_MOVIES;
      return { items, page: 1, totalPages: 1, source: 'fallback' };
    }

    const path = search ? '/search/movie' : '/movie/now_playing';
    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'pt-BR',
      page: String(page),
    });
    if (search) params.set('query', search);

    const cacheKey = `${path}?${params}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const response = await fetch(`${TMDB_BASE}${path}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { items: FALLBACK_MOVIES, page: 1, totalPages: 1, source: 'fallback' };
    }

    const data = (await response.json()) as {
      results: TmdbMovie[];
      total_pages: number;
    };
    const result: CatalogResult = {
      items: data.results.map((movie) => this.mapTmdbMovie(movie)),
      page,
      totalPages: Math.min(data.total_pages, 20),
      source: 'tmdb',
    };

    this.cache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  }

  private mapTmdbMovie(movie: TmdbMovie): CatalogItem {
    return {
      ref: `tmdb-${movie.id}`,
      category: 'MOVIE',
      title: movie.title,
      description: movie.overview || 'Sem sinopse disponível.',
      posterUrl: movie.poster_path
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : null,
      releaseYear: movie.release_date
        ? Number(movie.release_date.slice(0, 4))
        : null,
      genre: movie.genre_ids
        .slice(0, 2)
        .map((id) => GENRE_NAMES[id])
        .filter(Boolean)
        .join(' / ') || null,
    };
  }

  async getTrailer(
    ref?: string,
    title?: string,
  ): Promise<{ youtubeKey: string | null; title: string | null }> {
    const staticTrailers: Record<string, { youtubeKey: string; title: string }> = {
      'movie-duna2': { youtubeKey: 'Way9Dexny3w', title: 'Duna: Parte 2' },
      'movie-oppenheimer': { youtubeKey: 'uYPbbksJxIg', title: 'Oppenheimer' },
      'movie-parasita': { youtubeKey: '5xH0R_gx3Dc', title: 'Parasita' },
      'movie-tudo-em-todo-lugar': { youtubeKey: 'wxN1T1uxQ2g', title: 'Tudo em Todo Lugar ao Mesmo Tempo' },
      'movie-cidade-de-deus': { youtubeKey: 'dcUOO4Itgmw', title: 'Cidade de Deus' },
      'movie-interstellar': { youtubeKey: 'zSWdZVtXT7E', title: 'Interestelar' },
      'show-coldplay': { youtubeKey: 'V3ZhpFXzL1g', title: 'Coldplay - Music of the Spheres' },
      'show-alok': { youtubeKey: 'sW8YtF7Gk1U', title: 'Alok - Live Show' },
      'show-orquestra': { youtubeKey: 'Q_k8QZ7x5j4', title: 'Orquestra Petrobras Sinfônica' },
    };

    if (ref && staticTrailers[ref]) {
      return staticTrailers[ref];
    }

    if (ref?.startsWith('tmdb-')) {
      const movieId = ref.replace('tmdb-', '');
      const apiKey = this.config.get<string>('TMDB_API_KEY');
      if (apiKey) {
        try {
          const fetchVideos = async (lang: string) => {
            const res = await fetch(
              `${TMDB_BASE}/movie/${movieId}/videos?api_key=${apiKey}&language=${lang}`,
              { signal: AbortSignal.timeout(5000) },
            );
            if (!res.ok) return [];
            const data = (await res.json()) as { results?: Array<{ site: string; type: string; key: string; name: string }> };
            return data.results || [];
          };

          let videos = await fetchVideos('pt-BR');
          if (videos.length === 0) {
            videos = await fetchVideos('en-US');
          }

          const trailer =
            videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
            videos.find((v) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip')) ||
            videos.find((v) => v.site === 'YouTube');

          if (trailer) {
            return { youtubeKey: trailer.key, title: trailer.name };
          }
        } catch {
          // fallback silencioso
        }
      }
    }

    if (title) {
      const normalized = title.toLowerCase();
      for (const [key, item] of Object.entries(staticTrailers)) {
        if (normalized.includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(normalized)) {
          return item;
        }
      }
    }

    return { youtubeKey: null, title: null };
  }
}

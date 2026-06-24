/**
 * Common shared types used across the application.
 */

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

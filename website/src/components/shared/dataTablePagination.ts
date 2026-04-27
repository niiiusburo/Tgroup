export type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

export function getPaginationItems(totalPages: number, currentPage: number): readonly PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const lastPage = totalPages - 1;
  if (currentPage <= 2) {
    return [0, 1, 2, 3, 'end-ellipsis', lastPage];
  }
  if (currentPage >= lastPage - 2) {
    return [0, 'start-ellipsis', lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
  }

  return [0, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', lastPage];
}

import { Connector } from '@chili-publish/studio-connectors';

export function getFilterText(options: Connector.QueryOptions): string {
  const filter = options?.filter;
  if (!filter || filter.length === 0) {
    return '';
  }

  return filter.toString().trim();
}

export function isSearching(options: Connector.QueryOptions): boolean {
  return getFilterText(options).length > 0;
}

export function buildSearchQuery(
  options: Connector.QueryOptions,
  context: Connector.Dictionary,
  logError: (err: string) => void = () => {}
): string {
  const stringifiedFilter = getFilterText(options);
  let searchValue = 'format:(eps OR jpeg OR jpg OR pdf OR png OR psd OR tif OR tiff OR ai)';

  if (stringifiedFilter) {
    let id;

    try {
      id = JSON.parse(stringifiedFilter).id;
      logError(`ID ${id}`);
    } catch (e) {
      // filter is not JSON
    }

    if (id) {
      logError(`Filtering query by _id: ${id}`);

      searchValue += `AND _id: ${id}`;
    } else if (context?.searchQuery) {
      logError(`Filtering query by ${stringifiedFilter} in ${context.searchQuery}`);

      const searchInput = context.searchQuery.toString().replace('<search_input>', stringifiedFilter);
      searchValue += `AND ${searchInput}`;
    }
  }

  return `&search=${encodeURIComponent(searchValue)}`;
}

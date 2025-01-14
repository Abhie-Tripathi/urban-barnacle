export * from './sortBy';
export * from './regions';
export * from './timezones';

export function getNonEmptyParams(params: any) {
  return Object.keys(params).reduce(
    (acc, key) => {
      if (
        (typeof params[key] === 'string' && params[key]) ||
        (typeof params[key] === 'object' &&
          Object.keys(params[key]).length > 0) ||
        typeof params[key] === 'number' ||
        typeof params[key] === 'boolean'
      ) {
        acc[key] = params[key];
      }
      return acc;
    },
    {} as Record<string, any>,
  );
}

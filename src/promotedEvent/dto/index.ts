export * from './create.dto';
export * from './query.dto';

export type EventStats = {
  followers: {
    total_count: number;
  };
  exhibitor: {
    total_count: number;
    total_audited: number;
    intenational_count: number;
    intenational_audited: number;
    domestic_count: number;
    domestic_audited: number;
  };
  visitor: {
    total_count: number;
    total_audited: number;
    intenational_count: number;
    intenational_audited: number;
    domestic_count: number;
    domestic_audited: number;
  };
  area: {
    total_area: number;
    total_audited: number;
    intenational_area: number;
    intenational_audited: number;
    domestic_area: number;
    domestic_audited: number;
  };
};

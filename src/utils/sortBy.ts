// start, -start, end, -end, added, -added , title, -title, attendence,
// -attendence, localranking, -localranking, ranking, -ranking, aviation,
//  -aviation, updated, -updated, duration, -duration, relevence, -relevence,

// type Option = {
//   type: string;
//   order: 'asc' | 'desc';
// };
export enum SortByOptions {
  start = 'start',
  '-start' = '-start',
  end = 'end',
  '-end' = '-end',
  added = 'added',
  '-added' = '-added',
  title = 'title',
  '-title' = '-title',
  visitors = 'visitors',
  '-visitors' = '-visitors',
  exhibitors = 'exhibitors',
  '-exhibitors' = '-exhibitors',
  inboundScore = 'inboundScore',
  '-inboundScore' = '-inboundScore',
  impactScore = 'impactScore',
  '-impactScore' = '-impactScore',
  internationalScore = 'internationalScore',
  '-internationalScore' = '-internationalScore',
  updated = 'updated',
  '-updated' = '-updated',
  duration = 'duration',
  '-duration' = '-duration',
  'inboundEstimate' = 'inboundEstimate',
  '-inboundEstimate' = '-inboundEstimate',
  'internationalEstimate' = 'internationalEstimate',
  '-internationalEstimate' = '-internationalEstimate',
  distance = 'distance',
  '-distance' = '-distance',
  'status' = 'status',
  '-status' = '-status',
  score = 'score',
  '-score' = '-score',
}

// export const sortByOptions: Record<SortByOptions, Option> = {
//   start: {
//     type: 'startDateTime',
//     order: 'asc',
//   },
//   '-start': {
//     type: 'startDateTime',
//     order: 'desc',
//   },
//   end: {
//     type: 'endDateTime',
//     order: 'asc',
//   },
//   '-end': {
//     type: 'endDateTime',
//     order: 'desc',
//   },
//   added: {
//     type: 'createdAt',
//     order: 'asc',
//   },
//   '-added': {
//     type: 'createdAt',
//     order: 'desc',
//   },
//   title: {
//     type: 'name',
//     order: 'asc',
//   },
//   '-title': {
//     type: 'name',
//     order: 'desc',
//   },
//   attendance: {
//     type: 'totalEstimatedAttendanceByOrganizer',
//     order: 'asc',
//   },
//   '-attendance': {
//     type: 'totalEstimatedAttendanceByOrganizer',
//     order: 'desc',
//   },
//   localranking: {
//     type: 'localRank',
//     order: 'asc',
//   },
//   '-localranking': {
//     type: 'localRank',
//     order: 'desc',
//   },
//   ranking: {
//     type: 'eventRank',
//     order: 'asc',
//   },
//   '-ranking': {
//     type: 'eventRank',
//     order: 'desc',
//   },
//   aviation: {
//     type: 'aviationRank',
//     order: 'asc',
//   },
//   '-aviation': {
//     type: 'aviationRank',
//     order: 'desc',
//   },
//   updated: {
//     type: 'updatedAt',
//     order: 'asc',
//   },
//   '-updated': {
//     type: 'updatedAt',
//     order: 'desc',
//   },
//   duration: {
//     type: 'duration',
//     order: 'asc',
//   },
//   '-duration': {
//     type: 'duration',
//     order: 'desc',
//   },
//   relevence: {
//     type: 'relevence',
//     order: 'asc',
//   },
//   '-relevence': {
//     type: 'relevence',
//     order: 'desc',
//   },
// };

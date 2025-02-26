import { EventDataDto, QueryDto } from './dto';

export function eventSearchFilterCheck(data: any, query: QueryDto) {
  let checkToPassFilter: boolean = true;
  let shows: string = query.show?.join(',') ?? '';
  let rootTodiscard: string = '';
  const checkTheValue = (main: string[], sub: string[]) => {
    let count: number = 0;
    for (const val1 of main) {
      for (const val2 of sub) {
        if (val2 === val1) {
          count++;
        }
      }
    }
    console.log(main, sub, count, { main: main.length }, count === main.length);
    return main.length > 0 || sub.length > 0
      ? count === main.length && count >= 1
      : true;
  };
  if (data.eventType) {
    const main = query?.eventTypes ?? [];
    const sub = (data?.eventType?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }

    //   console.log(query.eventType, main[0], sub, 2);
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'eventTypes';
    }
  }
  if (data.eventFormat && checkToPassFilter) {
    const main = query?.eventFormats ?? [];
    const sub = (data?.eventFormat?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'eventFormats';
    }
  }
  if (data.eventRanking && checkToPassFilter) {
    const main = query?.ratings ?? [];
    const sub = (data?.eventRanking?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    shows = shows.replace('rankings', '');
    if (checkToPassFilter === false) {
      rootTodiscard = 'rankings';
    }
  }
  if (data.eventStatus && checkToPassFilter) {
    const main = query?.status ?? [];
    const sub = (data?.eventStatus?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'status';
    }
  }
  // if (query.eventRating || checkToPassFilter) {
  //   const main = query.eventRating.split(',');
  //   const sub = data.eventRating.enabledValue as string[];
  //   if (sub.length > main.length) {
  //     checkToPassFilter = false;
  //   }
  //   checkToPassFilter =  checkTheValue(main, sub);
  //   shows = shows.replace('eventRating', '');
  // }
  if (data.maturity && checkToPassFilter) {
    const main = query?.maturity ?? [];
    const sub = (data?.maturity?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    shows = shows.replace('maturity', '');
    if (checkToPassFilter === false) {
      rootTodiscard = 'maturity';
    }
  }
  if (data.branded && checkToPassFilter) {
    checkToPassFilter =
      (query.onlyBranded === true ? true : false) ===
      data?.branded?.enabledValue?.eventBrand;
    checkToPassFilter === undefined ? false : checkToPassFilter;
    if (checkToPassFilter === false) {
      rootTodiscard = 'onlyBranded';
    }
  }
  if (data.branded && checkToPassFilter) {
    checkToPassFilter =
      (query.onlySeries === true ? true : false) ===
      data.branded.enabledValue.eventSeries;
    checkToPassFilter === undefined ? false : checkToPassFilter;
    if (checkToPassFilter === false) {
      rootTodiscard = 'onlySeries';
    }
  }
  // need to ask
  // if (data.isforecasted && checkToPassFilter) {
  //   checkToPassFilter =
  //     query.isforecasted === data.isforecasted.isForecastedEnabled;
  //   checkToPassFilter === undefined ? false : checkToPassFilter;
  //   if (checkToPassFilter === false) {
  //     rootTodiscard = 'isforecasted';
  //   }
  // }
  if (data.eventEntry && checkToPassFilter) {
    const main = query?.entryType ?? [];
    const sub = (data?.eventEntry?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'entryType';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (data.eventFrequency && checkToPassFilter) {
    const main = query?.frequencies ?? [];
    const sub = (data?.eventFrequency?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'frequencies';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  // if (data.eventSize && checkToPassFilter) {
  //   const main = query?.?.split(',') ?? [];
  //   const sub = (data?.eventSize?.enabledValue as string[]) ?? [];
  //   if (sub.length > main.length) {
  //     checkToPassFilter = false;
  //   }
  //   checkToPassFilter = checkTheValue(main, sub);
  //   if (checkToPassFilter === false) {
  //     rootTodiscard = 'eventSize';
  //   }
  // }
  if (data.estimatedVisitorRangeTag && checkToPassFilter) {
    const main = query?.estimatedVisitorRangeTag ?? [];
    const sub =
      (data?.estimatedVisitorRangeTag?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'estimatedVisitorRangeTag';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (data.estimatedExhibitScore && checkToPassFilter) {
    const main = query?.estimatedExhibitors ?? [];
    const sub = (data?.estimatedExhibitScore?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'estimatedExhibitors';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  // if ((query.designation || data.designation) && checkToPassFilter) {
  //   checkToPassFilter =
  //     query.designation && data.designation.isProfileEnabed;
  //   checkToPassFilter =
  //     checkToPassFilter === undefined ? false : checkToPassFilter;
  //   if (checkToPassFilter === false) {
  //     rootTodiscard = 'designation';
  //   }
  // }
  console.log('checkToPassFilter11111', checkToPassFilter);
  if (data.audienceSpread && checkToPassFilter) {
    const main = query?.audienceSpread ?? [];
    const sub = (data?.audienceSpread?.enabledValue as string[]) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    checkToPassFilter =
      checkToPassFilter === undefined ? false : checkToPassFilter;
    if (checkToPassFilter === false) {
      rootTodiscard = 'audienceSpread';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (data.locationIds && checkToPassFilter) {
    const main = query?.locationIds ?? [];
    const sub: string[] =
      (
        data?.locationIds?.enabledValue as {
          id: string;
          description: string;
          type: string;
        }[]
      )?.map((data) => data.id) ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'locationIds';
    }
  }
  console.log('query.eventCategory', data.eventCategory, checkToPassFilter);
  if (data?.eventCategory?.enabledValue && checkToPassFilter) {
    const main = query?.categories ?? [];
    const sub: string[] =
      (
        data?.eventCategory?.enabledValue as {
          id: string;
          slug: string;
        }[]
      )?.map((data) => data.id) ?? [];
    console.log('query.eventCategory', main, sub);

    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'eventCategory';
    }
  }
  if (data?.durations?.startDate && checkToPassFilter) {
    const [durationStart, durationEnd] =
      data?.durations?.startDate?.split(',').map((date) => new Date(date)) ??
      [];
    const [rangeStart, rangeEnd] =
      query?.active_gte?.split(',').map((date) => new Date(date)) ?? [];
    checkToPassFilter = durationStart <= rangeStart && rangeEnd <= durationEnd;
    //   if (!query.endDate && query.startDate) {
    //     query.startDate =
    //       rangeStart.toISOString() + ',' + durationEnd.toISOString();
    //   }
    //   console.log('query.startDate', query.startDate);

    if (checkToPassFilter === false) {
      rootTodiscard = 'active_gte';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (data?.durations?.endDate && checkToPassFilter) {
    const [durationStart, durationEnd] =
      data?.durations?.endDate?.split(',').map((date) => new Date(date)) ?? [];
    const [rangeStart, rangeEnd] =
      query?.active_lte?.split(',').map((date) => new Date(date)) ?? [];
    checkToPassFilter = durationStart <= rangeStart && rangeEnd <= durationEnd;
    //   if (query.endDate && !query.startDate) {
    //     query.endDate =
    //       rangeStart.toISOString() + ',' + durationEnd.toISOString();
    //   }
    if (checkToPassFilter === false) {
      rootTodiscard = 'active_lte';
    }
  }
  if (
    data.durations &&
    !query.active_gte &&
    !query.active_lte
    // &&      !query.groupBy
  ) {
    checkToPassFilter = false;
    rootTodiscard = 'startDate/endDate';
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (data?.keywords?.negativeKeywords && checkToPassFilter) {
    const main = query?.excludeKeywords ?? [];
    const sub: string[] = data?.keywords?.negativeKeywords ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'excludeKeywords';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);

  if (data?.keywords?.positiveKeywords && checkToPassFilter) {
    const main = query?.includeKeywords ?? [];
    const sub: string[] = data?.keywords?.positiveKeywords ?? [];
    if (sub.length > main.length) {
      checkToPassFilter = false;
    }
    checkToPassFilter = checkTheValue(main, sub);
    if (checkToPassFilter === false) {
      rootTodiscard = 'includeKeywords';
    }
  }
  console.log('checkToPassFilter', checkToPassFilter);
  if (query.eventIds) {
    checkToPassFilter = true;
  }
  console.log('checkToPassFilter', checkToPassFilter);
  return {
    result: checkToPassFilter,
    rootTodiscard: rootTodiscard,
  };
}

const DataGroups = {
  basic: [
    'id',
    'name',
    'primaryEventType',
    'categories',
    'eventTypes',
    'tags',
    'format',
    'eventLocation',
    'tickets',
    'bannerUrl',
    'createdAt',
    'description',
    'designations',
    'startDateTime',
    'endDateTime',
    'entryType',
    'lastVerifiedOn',
    'logoUrl',
    'organizer',
    'status',
    'timings',
    'updatedAt',
    'website',
    '10timesEventPageUrl',
    'rating',
    'isNew',
    'matchedKeywords',
    'matchedKeywordsPercentage',
    'type',
    'level',
    'startDate',
    'endDate',
    'lastModified',
    'originLatitude',
    'originLongitude',
  ],

  advance: [
    'editions',
    'isBranded',
    'isSeries',
    'rehostDate',
    'rehostDate',
    'maturity',
    'frequency',
  ],
  insights: [
    'estimatedAttendance',
    'estimatedExhibitors',
    'estimatedAttendanceMean',
    'estimatedVisitorRangeTag',
    'rankings',
    'exhibitorsCount',
    'rehostScore',
    'repeatSentiment',
    'reputationScore',
    'speakersCount',
    'sponsorsCount',
    'economicImpact',
    'economicImpactBreakdown',
    'trustScore',
    'yoyGrowth',
    'scores',
  ],
  audience: ['audienceSpread', 'designationSpread', 'audienceZone'],
};

export function transformEventData(data: EventDataDto) {
  const { alerts, trackerMatchInfo, ...rest } = data;
  const basic = {};
  const advance = {};
  const insights = {};
  const audience = {};
  Object.keys(rest).forEach((key) => {
    if (DataGroups.basic.includes(key)) {
      basic[key] = rest[key];
    } else if (DataGroups.advance.includes(key)) {
      if (key === 'scores') {
        const scores = rest['scores'];
        Object.keys(scores).forEach((score) => {
          advance[score] = scores[score];
        });
      } else {
        advance[key] = rest[key];
      }
    } else if (DataGroups.insights.includes(key)) {
      insights[key] = rest[key];
    } else if (DataGroups.audience.includes(key)) {
      audience[key] = rest[key];
    }
  });
  return {
    basic,
    advance,
    insights,
    audience,
    alerts,
    ...(Object.keys(trackerMatchInfo ?? {}).length ? { trackerMatchInfo } : {}),
  };
}

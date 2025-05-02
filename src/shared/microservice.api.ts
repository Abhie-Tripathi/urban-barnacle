import { HttpException, HttpStatus } from '@nestjs/common';

export const microServiceApis = {
  categoryFetch: `${process.env.MICROSERVICE_URL}/categories`,
  eventDataFetch: `${process.env.MICROSERVICE_URL}/`,
  designationFetch: `${process.env.MICROSERVICE_URL}/designations`,
  companySuggestionsFetch: `${process.env.MICROSERVICE_URL}/company/suggestion`,
  eventSuggestionsFetch: `${process.env.MICROSERVICE_URL}/events`,
  authUserFetch: `${process.env.MICROSERVICE_URL}/auth/:userId/validate`,
  companysearch: process.env.MICROSERVICE_URL + '/companies',
  companyevents: process.env.MICROSERVICE_URL + '/companies/:companyId/events',
  companypoc: process.env.MICROSERVICE_URL + '/companies/:companyId/pocs',
  companybyId: process.env.MICROSERVICE_URL + '/companies/:companyId',
  usersearch: process.env.MICROSERVICE_URL + '/users',
  userevents: process.env.MICROSERVICE_URL + '/users/:userId/events',
  userpoc: process.env.MICROSERVICE_URL + '/users/:userId/pocs',
  userbyId: process.env.MICROSERVICE_URL + '/users/:userId',
  locationSuggestionApi: process.env.MICROSERVICE_URL + '/locations',
  findDuplicateEvent: process.env.MICROSERVICE_URL + '/events/find-duplicate'
};

export async function fetchDatafromMicroService(
  apiToFetch: string,
  query: any,
) {
  try {
    const { companyId, userId, ...rest } = query;
    const queryString = new URLSearchParams(rest).toString();
    const url = `${microServiceApis[`${apiToFetch}`].replace(':companyId', companyId || '').replace(':userId', userId || '')}${queryString ? `?${queryString}` : ''}`;
    console.log(url);
    const response = await fetch(url, {
      method: 'GET',
    });
    const data = await response.json();
    // console.log(data);

    return data;
  } catch (error: any) {
    console.error(error);
    throw new HttpException('something went wrong', HttpStatus.BAD_REQUEST);
  }
}

export async function postDatafromMicroService(
  apiToFetch: string,
  body: any,
) {
  try {
    const url = `${microServiceApis[`${apiToFetch}`]}`;
    console.log(url, JSON.stringify(body));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    // console.log(data);

    return data;
  } catch (error: any) {
    console.error(error);
    throw new HttpException('something went wrong', HttpStatus.BAD_REQUEST);
  }
}
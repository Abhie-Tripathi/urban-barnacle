import { HttpException, HttpStatus } from '@nestjs/common';

export const microServiceApis = {
  categoryFetch: `${process.env.MICROSERVICE_URL}/categories`,
  eventDataFetch: `${process.env.MICROSERVICE_URL}/`,
  designationFetch: `${process.env.MICROSERVICE_URL}/designations`,
  companySuggestionsFetch: `${process.env.MICROSERVICE_URL}/company/suggestion`,
  eventSuggestionsFetch: `${process.env.MICROSERVICE_URL}/event`,
  authUserFetch: `${process.env.MICROSERVICE_URL}/auth/user`,
  company: {
    search: process.env.MICROSERVICE_URL + '/companies',
    events: process.env.MICROSERVICE_URL + '/companies/:companyId/events',
    poc: process.env.MICROSERVICE_URL + '/companies/:companyId/pocs',
    byId: process.env.MICROSERVICE_URL + '/companies/:companyId'
  },
  user: {
    search: process.env.MICROSERVICE_URL + '/users',
    events: process.env.MICROSERVICE_URL + '/users/:userId/events',
    poc: process.env.MICROSERVICE_URL + '/users/:userId/pocs',
    byId: process.env.MICROSERVICE_URL + '/users/:userId'
  }
};

export async function fetchDatafromMicroService(
  apiToFetch: string,
  query: any,
) {
  try {
    const queryString = new URLSearchParams(query).toString();
    const url = `${microServiceApis[`${apiToFetch}`]}?${queryString}`;
    console.log(url)
    const response = await fetch(url, {
      method: 'GET',
    });
    const data = await response.json();
    // console.log(data);

    return data;
  } catch (error: any) {
    // console.error(error);
    throw new HttpException('something went wrong', HttpStatus.BAD_REQUEST)
  }
}

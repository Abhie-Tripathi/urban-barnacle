import { HttpException, HttpStatus } from '@nestjs/common';

export const microServiceApis = {
  categoryFetch: `${process.env.MICROSERVICE_URL}/categories`,
  eventDataFetch: `${process.env.MICROSERVICE_URL}/`,
  designationFetch: `${process.env.MICROSERVICE_URL}/designations`,
  companySuggestionsFetch: `${process.env.MICROSERVICE_URL}/company/suggestion`,
  eventSuggestionsFetch: `${process.env.MICROSERVICE_URL}/event`,
  authUserFetch: `${process.env.MICROSERVICE_URL}/auth/user`
};

export async function fetchDatafromMicroService(
  apiToFetch: string,
  query: any,
) {
  try {
    const queryString = new URLSearchParams(query).toString();
    const url = `${microServiceApis[`${apiToFetch}`]}?${queryString}`;
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

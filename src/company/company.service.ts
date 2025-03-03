import { Injectable } from '@nestjs/common';
import { EventDataDto } from 'src/events/dto';
import { transformEventData } from 'src/events/global.service';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { SharedService } from 'src/shared/shared.service';
import { decrypt, encrypt } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class CompanyService {
    constructor(
        private readonly sharedService: SharedService,
    ) { }
    async getCompanyProspectData(query: ProspectSchemaDto, viewAs: string) {
        return await this.sharedService.getCompanyAndUserDataForProspect(query, viewAs, 'company');
    }
    async getCompnayEvents(companyId: string, query, userData: TCachedUser) {
        return await this.sharedService.getProspectEventAndMap(companyId, { ...query, type: 'company' });
    }
    async getCompanyPoc(companyId: string) {
        companyId = decrypt(companyId).replace(
            process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
            '',
        );
        const baseURL = process.env.MICROSERVICE_URL || '';
        const endpoint = microserviceEndpoints.company.poc;
        // const queryString = new URLSearchParams(query).toString();
        const url = `${baseURL}${endpoint}/${companyId}`;
        const response = await fetch(url, {
            method: 'GET',
        });

        // if (!response.ok) {
        //   throw new Error(`Error fetching categories: ${response.statusText}`);
        // }

        const data = await response.json();
        console.log(data);

        return {
            data: {
                companyPoc: data.data.companyPoc.map((val) => {
                    return { ...val, id: encrypt(val.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY as string) };
                }),
            },
        };

    }
}

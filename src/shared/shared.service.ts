// generateSlug : to generate a slug

import { Injectable } from '@nestjs/common';

@Injectable()
export class SharedService {
  generateSlug(title: string) {
    return title.toLowerCase().replace(/ /g, '-');
  }
}

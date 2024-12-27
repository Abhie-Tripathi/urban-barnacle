import { Controller } from '@nestjs/common';
import { UserInterestService } from './user-interest.service';

@Controller('user-interest')
export class UserInterestController {
  constructor(private readonly userInterestService: UserInterestService) {}
}

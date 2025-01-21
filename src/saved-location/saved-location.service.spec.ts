import { Test, TestingModule } from '@nestjs/testing';
import { SavedLocationService } from './saved-location.service';

describe('SavedLocationService', () => {
  let service: SavedLocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedLocationService],
    }).compile();

    service = module.get<SavedLocationService>(SavedLocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

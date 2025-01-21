import { Test, TestingModule } from '@nestjs/testing';
import { SavedLocationController } from './saved-location.controller';

describe('SavedLocationController', () => {
  let controller: SavedLocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedLocationController],
    }).compile();

    controller = module.get<SavedLocationController>(SavedLocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

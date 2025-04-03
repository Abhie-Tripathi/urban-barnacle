import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OthersService } from './others.service';
import { DemoDto, PresetDto } from './dto';

@Controller('others')
export class OthersController {
  constructor(private readonly othersService: OthersService) { }
  @Get('preset')
  async getPresetData(@Query() query: PresetDto) {
    return await this.othersService.getPresetData(query);
  }
  @Post('demoConatactMail')
  async sendDemoContactEmail(@Body() data: DemoDto) {
    return await this.othersService.sendDemoContactEmail(data);
  }
}

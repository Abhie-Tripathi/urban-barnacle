import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OthersService } from './others.service';
import { DemoDto, PresetDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('others')
export class OthersController {
  constructor(private readonly othersService: OthersService) { }
  @UseGuards(AuthGuard)
  @Get('preset')
  async getPresetData(@Query() query: PresetDto) {
    return await this.othersService.getPresetData(query);
  }
  @Post('demoConatactMail')
  async sendDemoContactEmail(@Body() data: DemoDto) {
    return await this.othersService.sendDemoContactEmail(data);
  }
}

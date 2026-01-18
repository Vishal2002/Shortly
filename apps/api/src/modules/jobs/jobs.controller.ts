import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';


@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  async create(
    @Request() req,
    @Body() body: { youtubeUrl: string; options?: any }
  ) {
    const options = body.options || {
      clipCount: 5,
      minDuration: 15,
      maxDuration: 60,
      autoUpload: false,
      addSubtitles: true,
    };

    return this.jobsService.create(req.user.userId, body.youtubeUrl, options);
  }

  @Get()
  async findAll(@Request() req) {
    return this.jobsService.findByUserId(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }
}
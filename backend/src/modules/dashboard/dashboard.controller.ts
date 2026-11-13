import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Request() request: { user: { id: string } },
    @Query('salaoId') salaoId?: string,
  ) {
    return this.dashboardService.getOverview(request.user.id, salaoId);
  }
}

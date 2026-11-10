import {
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '@shared/guards/access-token.guard';
import { StripeSubscriptionService } from '@stripe/services/stripe-subscription.service';

@ApiBearerAuth()
@ApiTags('Subscriptions')
@UseGuards(AccessTokenGuard)
@Controller('subscriptions')
export class StripeSubscriptionController {
  public constructor(
    private readonly subscriptionService: StripeSubscriptionService,
  ) {}

  @Post('monthly')
  @ApiOperation({ summary: 'Create a monthly subscription' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The monthly subscription has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  public async createMonthlySubscription(
    @Req() request: Request & { user: { stripeCustomerId: string } },
  ) {
    return this.subscriptionService.createMonthlySubscription(
      request.user.stripeCustomerId,
    );
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get a monthly subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The monthly subscription has been successfully retrieved.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  public async getMonthlySubscription(
    @Req() request: Request & { user: { stripeCustomerId: string } },
  ) {
    return this.subscriptionService.getMonthlySubscription(
      request.user.stripeCustomerId,
    );
  }
}

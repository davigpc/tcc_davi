import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateOrderDto } from '@order/dto/create-order.dto';
import { OrderService } from '@order/services/order.service';
import { AccessTokenGuard } from '@shared/guards/access-token.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('orders')
export class OrderController {
  public constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place order' })
  @ApiBody({
    type: CreateOrderDto,
  })
  public async placeOrder(
    @Body() newOrder: CreateOrderDto,
    @Req() request: Request & { user: { stripe_cus_id: string } },
  ): Promise<{ client_secret: string }> {
    return this.orderService.placeOrder(newOrder, request.user.stripe_cus_id);
  }
}

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from '@order/services/order.service';
import { CreateOrderDto } from '@order/dto/create-order.dto';
import { AccessTokenGuard } from '@shared/guards/access-token.guard';
import { ItemTypes } from '@item/enums/item-types.enum';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        OrderService,
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { stripe_cus_id: 'test_stripe_cus_id' };
          return true;
        },
      })
      .compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('placeOrder', () => {
    it('should call OrderService.placeOrder with correct parameters', async () => {
      const newOrder: CreateOrderDto = {
        customer: '66b7b3e8c32055a049b55029',
        items: [
          {
            id: '66b7b5a8901d3287c0cf6ea6',
            type: ItemTypes.PRODUCT,
            quantity: 1,
          },
        ],
        amount: 228.07,
        billing_details: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          address: '123 Main St, Anytown, USA',
          city: 'Anytown',
          postcode: '12345',
          phone: '+1234567890',
        },
        order_notes: 'Please deliver between 9 AM and 5 PM',
      };

      const stripeCusId = 'test_stripe_cus_id';
      const placeOrderSpy = jest
        .spyOn(service, 'placeOrder')
        .mockResolvedValue({ client_secret: 'test_client_secret' });

      await controller.placeOrder(newOrder, {
        user: { stripe_cus_id: stripeCusId },
      } as any);

      expect(placeOrderSpy).toHaveBeenCalledWith(newOrder, stripeCusId);
    });
  });
});

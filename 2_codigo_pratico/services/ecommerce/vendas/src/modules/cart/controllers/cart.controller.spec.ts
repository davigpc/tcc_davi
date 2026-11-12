import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from '@cart/services/cart.service';
import { Cart } from '@cart/schemas/cart.schema';
import { ItemTypes } from '@item/enums/item-types.enum';
import { CreateItemDto } from '@item/dto/create-item.dto';
import { UpdateItemDto } from '@item/dto/update-item.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';

describe('CartController', () => {
  let cartController: CartController;
  let cartService: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getByUserId: jest.fn(),
            getWithItemsById: jest.fn(),
            addItem: jest.fn(),
            updateItemQuantity: jest.fn(),
            removeItem: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideInterceptor(CacheInterceptor)
      .useValue({
        intercept: jest.fn((context, next) => next.handle()),
      })
      .compile();

    cartController = module.get<CartController>(CartController);
    cartService = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(cartController).toBeDefined();
  });

  describe('getCartByUserId', () => {
    it('should return a cart for a user', async () => {
      const userId = 'user123';
      const expectedCart = {} as Cart;
      jest.spyOn(cartService, 'getByUserId').mockResolvedValue(expectedCart);

      const result = await cartController.getByUserId(userId);
      expect(result).toEqual(expectedCart);
      expect(cartService.getWithItemsByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('getCartById', () => {
    it('should return a cart by id', async () => {
      const id = 'cart123';
      const expectedCart = {} as Cart;
      jest
        .spyOn(cartService, 'getWithItemsById')
        .mockResolvedValue(expectedCart);

      const result = await cartController.getById(id);
      expect(result).toEqual(expectedCart);
      expect(cartService.getWithItemsById).toHaveBeenCalledWith(id);
    });
  });

  describe('addItemToCart', () => {
    it('should add an item to a cart', async () => {
      const userId = 'user123';
      const newItem: CreateItemDto = {
        id: '60f4d9a3b6e2b2f3f8c6f6e6',
        type: ItemTypes.PRODUCT,
        quantity: 5,
      };
      const expectedCart = {} as Cart;
      jest.spyOn(cartService, 'addItem').mockResolvedValue(expectedCart);

      const result = await cartController.addItem(userId, newItem);
      expect(result).toEqual(expectedCart);
      expect(cartService.addItem).toHaveBeenCalledWith(userId, newItem);
    });
  });

  describe('updateItemQuantityInCart', () => {
    it('should update an item quantity in a cart', async () => {
      const id = 'cart123';
      const itemId = 'item123';
      const updateItem: UpdateItemDto = {
        quantity: 5,
      };
      const expectedCart = {} as Cart;
      jest
        .spyOn(cartService, 'updateItemQuantity')
        .mockResolvedValue(expectedCart);

      const result = await cartController.updateItemQuantity(
        id,
        itemId,
        updateItem,
      );
      expect(result).toEqual(expectedCart);
      expect(cartService.updateItemQuantity).toHaveBeenCalledWith(
        id,
        itemId,
        updateItem,
      );
    });
  });

  describe('removeItemFromCart', () => {
    it('should remove an item from a cart', async () => {
      const id = 'cart123';
      const itemId = 'item123';
      const expectedCart = {} as Cart;
      jest.spyOn(cartService, 'removeItem').mockResolvedValue(expectedCart);

      const result = await cartController.removeItem(id, itemId);
      expect(result).toEqual(expectedCart);
      expect(cartService.removeItem).toHaveBeenCalledWith(id, itemId);
    });
  });

  describe('removeCartById', () => {
    it('should remove a cart by id', async () => {
      const id = 'cart123';
      const expectedResponse = { message: 'Cart removed' };
      jest.spyOn(cartService, 'remove').mockResolvedValue(expectedResponse);

      const result = await cartController.remove(id);
      expect(result).toEqual(expectedResponse);
      expect(cartService.remove).toHaveBeenCalledWith(id);
    });
  });
});

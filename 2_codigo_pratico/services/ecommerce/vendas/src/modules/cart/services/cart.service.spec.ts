import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from '@cart/schemas/cart.schema';
import { CreateItemDto } from '@item/dto/create-item.dto';
import { UpdateItemDto } from '@item/dto/update-item.dto';
import { ItemTypes } from '@item/enums/item-types.enum';

const mockCartModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getModelToken(Cart.name),
          useValue: mockCartModel,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByUserId', () => {
    it('should return a cart if found', async () => {
      const userId = 'userId';
      const cart = { customer: userId };
      mockCartModel.findOne.mockResolvedValue(cart);

      const result = await service.getWithItemsByUserId(userId);
      expect(result).toEqual(cart);
    });

    it('should throw NotFoundException if no cart found', async () => {
      const userId = 'userId';
      mockCartModel.findOne.mockResolvedValue(null);

      await expect(service.getWithItemsByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCartById', () => {
    it('should return a cart if found', async () => {
      const id = 'cartId';
      const cart = { _id: id };
      mockCartModel.findById.mockResolvedValue(cart);

      const result = await service.getCartById(id);
      expect(result).toEqual(cart);
    });

    it('should throw NotFoundException if no cart found', async () => {
      const id = 'cartId';
      mockCartModel.findById.mockResolvedValue(null);

      await expect(service.getCartById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWithItemsById', () => {
    it('should return a cart with items if found', async () => {
      const id = 'cartId';
      const cart = { _id: id, items: [] };
      mockCartModel.findById.mockResolvedValue({
        populate: jest.fn().mockResolvedValue(cart),
      });

      const result = await service.getWithItemsById(id);
      expect(result).toEqual(cart);
    });

    it('should throw NotFoundException if no cart found', async () => {
      const id = 'cartId';
      mockCartModel.findById.mockResolvedValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getWithItemsById(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addItem', () => {
    it('should create a new cart if none exists', async () => {
      const userId = 'userId';
      const newItem: CreateItemDto = {
        id: '60f4d9a3b6e2b2f3f8c6f6e6',
        type: ItemTypes.PRODUCT,
        quantity: 5,
      };
      const cart = { customer: userId, items: [newItem] };
      mockCartModel.findOne.mockResolvedValue(null);
      mockCartModel.create.mockResolvedValue(cart);

      const result = await service.addItem(userId, newItem);
      expect(result).toEqual(cart);
    });

    it('should add item to existing cart', async () => {
      const userId = 'userId';
      const newItem: CreateItemDto = {
        id: '60f4d9a3b6e2b2f3f8c6f6e6',
        type: ItemTypes.PRODUCT,
        quantity: 5,
      };
      const existingCart = { customer: userId, items: [] };
      mockCartModel.findOne.mockResolvedValue(existingCart);
      mockCartModel.save.mockResolvedValue(existingCart);

      const result = await service.addItem(userId, newItem);
      expect(result).toEqual(existingCart);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const id = 'cartId';
      const itemId = 'itemId';
      const existingCart = { _id: id, items: [{ id: itemId }] };
      mockCartModel.findById.mockResolvedValue(existingCart);
      mockCartModel.save.mockResolvedValue(existingCart);

      const result = await service.removeItem(id, itemId);
      expect(result).toEqual(existingCart);
    });

    it('should throw NotFoundException if item not found', async () => {
      const id = 'cartId';
      const itemId = 'itemId';
      const existingCart = { _id: id, items: [] };
      mockCartModel.findById.mockResolvedValue(existingCart);

      await expect(service.removeItem(id, itemId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateItem', () => {
    it('should update item in cart', async () => {
      const id = 'cartId';
      const updateItem: CreateItemDto = {
        id: '60f4d9a3b6e2b2f3f8c6f6e6',
        type: ItemTypes.PRODUCT,
        quantity: 5,
      };
      const existingCart = { _id: id, items: [{ id: 'itemId', quantity: 1 }] };
      mockCartModel.findById.mockResolvedValue(existingCart);
      mockCartModel.save.mockResolvedValue(existingCart);

      const result = await service.updateItem(id, updateItem);
      expect(result).toEqual(existingCart);
    });

    it('should throw NotFoundException if item not found', async () => {
      const id = 'cartId';
      const updateItem: CreateItemDto = {
        id: '60f4d9a3b6e2b2f3f8c6f6e6',
        type: ItemTypes.PRODUCT,
        quantity: 5,
      };
      const existingCart = { _id: id, items: [] };
      mockCartModel.findById.mockResolvedValue(existingCart);

      await expect(service.updateItem(id, updateItem)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity in cart', async () => {
      const id = 'cartId';
      const itemId = 'itemId';
      const updateItem: UpdateItemDto = { quantity: 2 };
      const existingCart = { _id: id, items: [{ id: itemId, quantity: 1 }] };
      mockCartModel.findById.mockResolvedValue(existingCart);
      mockCartModel.save.mockResolvedValue(existingCart);

      const result = await service.updateItemQuantity(id, itemId, updateItem);
      expect(result).toEqual(existingCart);
    });

    it('should throw NotFoundException if item not found', async () => {
      const id = 'cartId';
      const itemId = 'itemId';
      const updateItem: UpdateItemDto = { quantity: 2 };
      const existingCart = { _id: id, items: [] };
      mockCartModel.findById.mockResolvedValue(existingCart);

      await expect(
        service.updateItemQuantity(id, itemId, updateItem),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove cart', async () => {
      const id = 'cartId';
      const resultMessage = { message: 'Cart deleted successfully' };
      mockCartModel.findByIdAndDelete.mockResolvedValue(resultMessage);

      const result = await service.remove(id);
      expect(result).toEqual(resultMessage);
    });

    it('should throw NotFoundException if cart not found', async () => {
      const id = 'cartId';
      mockCartModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});

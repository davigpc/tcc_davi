import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument, shippingCostOf } from '@cart/schemas/cart.schema';
import { CreateItemDto } from '@item/dto/create-item.dto';
import { UpdateItemDto } from '@item/dto/update-item.dto';
import { AddShippingOptionsDto } from '@shipping/dtos/add-shipping-option.dto';
import { RemoveShippingOptionDto } from '@shipping/dtos/remove-shipping-option.dto';
import { CatalogoClient } from '@clients/catalogo.client';
import { ClientesClient } from '@clients/clientes.client';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  public constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    private readonly catalogoClient: CatalogoClient,
    private readonly clientesClient: ClientesClient,
  ) {}

  public async getCartById(id: string): Promise<Cart> {
    this.logger.log(`Fetching cart with ID: ${id}`);
    const cart = await this.cartModel.findById(id);
    if (!cart) {
      this.logger.warn(`Cart with ID ${id} not found`);
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    this.logger.log(`Fetched cart with ID: ${id}`);
    return cart;
  }

  public async getCartWithItemsById(id: string): Promise<any> {
    this.logger.log(`Fetching cart with items for ID: ${id}`);
    const cart = await this.cartModel.findById(id).lean();
    if (!cart) {
      this.logger.warn(`Cart with ID ${id} not found`);
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    this.logger.log(`Fetched cart with items for ID: ${id}`);
    return this.withProductData(cart);
  }

  public async getWithItemsByUserId(userId: string): Promise<any> {
    this.logger.log(`Fetching cart for user with ID: ${userId}`);
    const cart = await this.cartModel.findOne({ customer: userId }).lean();
    if (!cart) {
      this.logger.warn(`No carts found for user with ID ${userId}`);
      throw new NotFoundException(`No carts found for user with ID ${userId}`);
    }
    this.logger.log(`Fetched cart for user with ID: ${userId}`);
    return this.withProductData(cart);
  }

  public async addItemToCart(
    userId: string,
    newItem: CreateItemDto,
  ): Promise<Cart> {
    this.logger.log(`Adding item ${newItem.id} to cart for user ${userId}`);
    const existingCart = await this.cartModel.findOne({ customer: userId });
    if (!existingCart) {
      this.logger.log(`Creating new cart for user ${userId}`);
      return this.createCartWithItem(userId, newItem);
    }
    this.logger.log(`Adding item to existing cart for user ${userId}`);
    return this.addItemToExistingCart(existingCart, newItem);
  }

  public async updateItemInCart(
    id: string,
    updateItem: CreateItemDto,
  ): Promise<Cart> {
    this.logger.log(`Updating item ${updateItem.id} in cart ${id}`);
    const existingCart = await this.getCartByIdOrThrow(id);

    const itemIndex = existingCart.items.findIndex(
      (item) => item.id.toString() === updateItem.id,
    );

    if (itemIndex === -1) {
      this.logger.warn(`Item with ID ${updateItem.id} not found in cart ${id}`);
      throw new NotFoundException(
        `Item with ID ${updateItem.id} not found in cart`,
      );
    }

    existingCart.items[itemIndex] = updateItem;
    await this.applyPricing(existingCart);
    this.logger.log(`Updated item ${updateItem.id} in cart ${id}`);
    return existingCart.save();
  }

  public async removeItemFromCart(id: string, itemId: string): Promise<Cart> {
    this.logger.log(`Removing item ${itemId} from cart ${id}`);
    const existingCart = await this.getCartByIdOrThrow(id);
    const itemIndex = existingCart.items.findIndex(
      (item) => item.id.toString() === itemId,
    );
    if (itemIndex === -1) {
      this.logger.warn(`Item with ID ${itemId} not found in cart ${id}`);
      throw new NotFoundException(`Item with ID ${itemId} not found in cart`);
    }
    existingCart.items.splice(itemIndex, 1);
    await this.applyPricing(existingCart);
    this.logger.log(`Removed item ${itemId} from cart ${id}`);
    return existingCart.save();
  }

  public async updateItemQuantityInCart(
    id: string,
    itemId: string,
    updateItem: UpdateItemDto,
  ): Promise<Cart> {
    this.logger.log(`Updating quantity of item ${itemId} in cart ${id}`);
    const existingCart = await this.getCartByIdOrThrow(id);

    const item = existingCart.items.find((i) => i.id.toString() === itemId);

    if (!item) {
      this.logger.warn(`Item with ID ${itemId} not found in cart ${id}`);
      throw new NotFoundException(`Item with ID ${itemId} not found in cart`);
    }

    item.quantity = updateItem.quantity;
    await this.applyPricing(existingCart);
    this.logger.log(`Updated quantity of item ${itemId} in cart ${id}`);
    return existingCart.save();
  }

  public async addShippingToCart(
    id: string,
    shippingOption: AddShippingOptionsDto,
  ): Promise<Cart> {
    this.logger.log(`Adding shipping options to cart ${id}`);
    const cart = await this.getCartByIdOrThrow(id);

    const newShippingOptions = shippingOption.shipping.filter(
      (option) => !cart.shipping.includes(option),
    );

    cart.shipping.push(...newShippingOptions);
    await this.applyPricing(cart);
    this.logger.log(`Added shipping options to cart ${id}`);
    return cart.save();
  }

  public async removeShippingInCart(
    id: string,
    shippingOption: RemoveShippingOptionDto,
  ) {
    this.logger.log(`Removing shipping option from cart ${id}`);
    const cart = await this.getCartByIdOrThrow(id);

    const index = cart.shipping.indexOf(shippingOption.shipping);
    if (index > -1) {
      cart.shipping.splice(index, 1);
      this.logger.log(`Removed shipping option from cart ${id}`);
    } else {
      this.logger.warn(
        `Shipping option ${shippingOption.shipping} not found in cart ${id}`,
      );
      throw new NotFoundException(
        `Shipping option ${shippingOption.shipping} not found in cart`,
      );
    }
    await this.applyPricing(cart);
    return cart.save();
  }

  public async removeCart(id: string): Promise<{ message: string }> {
    this.logger.log(`Removing cart with ID: ${id}`);
    const result = await this.cartModel.findByIdAndDelete(id);
    if (!result) {
      this.logger.warn(`Cart with ID ${id} not found`);
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    this.logger.log(`Removed cart with ID: ${id}`);
    return { message: 'Cart deleted successfully' };
  }

  /**
   * Valida comprador e itens e recalcula subtotal e total.
   *
   * Depois do snapshot final as coleções são separadas, então a validação e o
   * preço deixam de ser uma consulta local e passam a ser chamadas HTTP ao
   * Clientes e ao Catálogo.
   */
  private async applyPricing(cart: CartDocument): Promise<void> {
    await this.clientesClient.assertUser(String(cart.customer));

    const products = await this.catalogoClient.getProducts(
      cart.items.map((item) => String(item.id)),
    );

    let subtotal = 0;
    for (const item of cart.items) {
      const product = products.get(String(item.id));
      if (!product) {
        throw new NotFoundException(
          `Item with ID ${item.id} of type ${item.type} not found`,
        );
      }
      subtotal += Number(product.price) * item.quantity;
    }

    cart.subtotal = subtotal;
    cart.total = subtotal + shippingCostOf(cart.shipping);
  }

  private async withProductData(cart: any): Promise<any> {
    const products = await this.catalogoClient.getProducts(
      cart.items.map((item: any) => String(item.id)),
    );

    return {
      ...cart,
      items: cart.items.map((item: any) => ({
        ...item,
        id: products.get(String(item.id)) ?? String(item.id),
      })),
    };
  }

  private async getCartByIdOrThrow(id: string): Promise<CartDocument> {
    this.logger.log(`Fetching cart with ID: ${id}`);
    const cart = await this.cartModel.findById(id);
    if (!cart) {
      this.logger.warn(`Cart with ID ${id} not found`);
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    this.logger.log(`Fetched cart with ID: ${id}`);
    return cart;
  }

  private async createCartWithItem(
    userId: string,
    newItem: CreateItemDto,
  ): Promise<Cart> {
    this.logger.log(
      `Creating new cart for user ${userId} with item ${newItem.id}`,
    );
    const cart = new this.cartModel({
      customer: userId,
      items: [newItem],
    });
    await this.applyPricing(cart);
    return cart.save();
  }

  private async addItemToExistingCart(
    existingCart: CartDocument,
    newItem: CreateItemDto,
  ): Promise<Cart> {
    this.logger.log(
      `Adding item ${newItem.id} to existing cart ${existingCart.id}`,
    );
    const itemExists = existingCart.items.some(
      (item) => item.id.toString() === newItem.id,
    );
    if (!itemExists) {
      existingCart.items.push(newItem);
      this.logger.log(`Added item ${newItem.id} to cart ${existingCart.id}`);
    } else {
      this.logger.log(
        `Item ${newItem.id} already exists in cart ${existingCart.id}`,
      );
    }
    await this.applyPricing(existingCart);
    return existingCart.save();
  }
}

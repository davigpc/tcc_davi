import { CreateProductDto } from '@product/dto/create-product.dto';
import { UpdateProductDto } from '@product/dto/update-product.dto';
import { Product } from '@product/schemas/product.schema';

export interface IProductService {
  /**
   * Create a new product.
   * @param createProductDto - Data Transfer Object for product creation.
   * @returns A promise that resolves to the created Product object.
   */
  create(createProductDto: CreateProductDto): Promise<Product>;

  /**
   * Get all products.
   * @returns A promise that resolves to an array of Product objects.
   */
  getAll(): Promise<Product[]>;

  /**
   * Get a product by its ID.
   * @param id - The ID of the product.
   * @returns A promise that resolves to the Product object if found, null otherwise.
   */
  getById(id: string): Promise<Product>;

  /**
   * Update a product.
   * @param id - The ID of the product to update.
   * @param updateProductDto - Data Transfer Object for product update.
   * @returns A promise that resolves to the updated Product object if found, null otherwise.
   */
  update(id: string, updateProductDto: UpdateProductDto): Promise<Product>;

  /**
   * Remove a product.
   * @param id - The ID of the product to remove.
   * @returns A promise that resolves when the removal is done.
   */
  remove(id: string): Promise<void>;
}

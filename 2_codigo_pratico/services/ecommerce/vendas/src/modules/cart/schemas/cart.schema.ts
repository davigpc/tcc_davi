import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Item, ItemSchema } from '@item/schemas/item.schema';
import {
  ShippingCosts,
  ShippingOptions,
} from '@shipping/enums/shipping-options.enum';

export type CartDocument = Cart & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Cart {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
  })
  customer: string;

  @Prop({ type: [ItemSchema], required: true })
  items: Item[];

  @Prop({ type: [String], enum: ShippingOptions, required: true })
  shipping: ShippingOptions[];

  @Prop({ type: Number, default: 0 })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  total: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

export function shippingCostOf(shipping: ShippingOptions[]): number {
  return shipping.reduce((acc, option) => acc + ShippingCosts[option], 0);
}

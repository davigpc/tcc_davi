import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type ProductDocument = Product & mongoose.Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  seller: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: Number })
  stock: number;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true })
  images: string[];

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  subcategory: string;

  @Prop()
  rating?: number;

  @Prop({ required: true, type: mongoose.Schema.Types.Mixed })
  attributes: { key: string; value: string }[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({
  name: 'text',
  category: 'text',
  description: 'text',
  subcategory: 'text',
});

ProductSchema.index({ name: 1 });

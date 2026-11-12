import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ItemTypes } from '@item/enums/item-types.enum';

export type ItemDocument = Item & mongoose.Document;

@Schema({
  versionKey: false,
  _id: false,
})
export class Item {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'items.type',
    required: true,
  })
  id: string;

  @Prop({
    required: true,
    enum: ItemTypes,
  })
  type: ItemTypes;

  @Prop({ type: Number, default: 1 })
  quantity: number;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

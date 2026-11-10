import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type AddressDocument = Address & mongoose.Document;

@Schema({
  versionKey: false,
})
export class Address {
  @Prop()
  street: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  country: string;

  @Prop()
  postal_code: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type StripeEventDocument = StripeEvent & Document;

@Schema({
  versionKey: false,
  timestamps: true,
})
export class StripeEvent {
  @Prop({ required: true, unique: true })
  event_id: string;
}

export const StripeEventSchema = SchemaFactory.createForClass(StripeEvent);

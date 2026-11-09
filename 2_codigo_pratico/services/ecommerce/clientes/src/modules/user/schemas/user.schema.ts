import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { IsEmail } from 'class-validator';
import { UserRole } from '@user/enums/roles.enum';
import { Address, AddressSchema } from '@address/schemas/address.schema';

export type UserDocument = User & mongoose.Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'role field is required'],
    enum: UserRole,
  })
  role: UserRole;

  @Prop({
    required: [true, 'name field is required'],
  })
  name: string;

  @Prop()
  surname?: string;

  @Prop({
    required: [true, 'email field is required'],
    unique: true,
    validate: [IsEmail, 'Invalid email format'],
    index: true,
  })
  email: string;

  @Prop({ type: AddressSchema })
  billing_address?: Address;

  @Prop({ type: [AddressSchema] })
  shipping_addresses: Address[];

  @Prop()
  profile_picture?: string;

  @Prop({
    required: [true, 'password field is required'],
    minlength: [6, 'Minimum password length is 6 characters'],
  })
  password: string;

  @Prop()
  rating?: number;

  @Prop()
  response_time?: string;

  @Prop()
  hire_count?: number;

  @Prop()
  password_token?: string;

  @Prop()
  bio?: string;

  @Prop()
  phone_number?: string;

  @Prop()
  status?: string;

  @Prop({ type: [String] })
  document_images: string[];

  @Prop()
  verification_token?: string;

  @Prop({ default: false })
  confirmed: boolean;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ default: false })
  is_online: boolean;

  @Prop()
  stripe_cus_id: string;

  @Prop({ nullable: true })
  monthly_subscription_status?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ name: 1 });

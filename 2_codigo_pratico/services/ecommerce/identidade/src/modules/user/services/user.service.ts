import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Nullable } from '@shared/types/common';
import { CustomerIdService } from './customer-id.service';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { CreateAddressDto } from '@address/dto/create-address.dto';
import { UpdateAddressDto } from '@address/dto/update-address.dto';
import { Address, AddressDocument } from '@address/schemas/address.schema';
import { User, UserDocument } from '@user/schemas/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  public constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly customerIdService: CustomerIdService,
  ) {}

  public async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user with email: ${userData.email}`);
    const stripeCustomerId = this.customerIdService.createCustomerId(
      userData.email,
    );
    const user = await this.userModel.findOneAndUpdate(
      { email: userData.email },
      { ...userData, stripe_cus_id: stripeCustomerId },
      { upsert: true, new: true },
    );
    this.logger.log(`User created with ID: ${user._id}`);
    return user;
  }

  public async updateUser(id: string, userData: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user with ID: ${id}`);
    const existingUser = await this.userModel.findByIdAndUpdate(id, userData, {
      new: true,
    });
    if (!existingUser) {
      this.logger.error(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.logger.log(`User with ID ${id} updated`);
    return existingUser;
  }

  public async getAllUsers(): Promise<User[]> {
    this.logger.log('Retrieving all users');
    return this.userModel.find();
  }

  public async getUserById(id: string): Promise<User> {
    this.logger.log(`Retrieving user with ID: ${id}`);
    const user = await this.userModel.findById(id);
    if (!user) {
      this.logger.error(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  public async getUserByEmail(email: string): Promise<Nullable<User>> {
    this.logger.log(`Retrieving user with email: ${email}`);
    return this.userModel.findOne({ email });
  }

  public async removeUser(id: string): Promise<void> {
    this.logger.log(`Removing user with ID: ${id}`);
    const result = await this.userModel.findOneAndDelete({ _id: id });
    if (!result) {
      this.logger.error(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.logger.log(`User with ID ${id} removed`);
  }

  public async updateMonthlySubscriptionStatus(
    stripeCustomerId: string,
    monthlySubscriptionStatus: string,
  ): Promise<void> {
    this.logger.log(
      `Updating monthly subscription status for stripeCustomerId: ${stripeCustomerId}`,
    );
    const updatedUser = await this.userModel.findOneAndUpdate(
      { stripe_cus_id: stripeCustomerId },
      { monthly_subscription_status: monthlySubscriptionStatus },
      { new: true },
    );
    if (!updatedUser) {
      this.logger.error(
        `User with stripeCustomerId ${stripeCustomerId} not found`,
      );
      throw new NotFoundException(
        `User with stripeCustomerId ${stripeCustomerId} not found`,
      );
    }
    this.logger.log(
      `Monthly subscription status updated for stripeCustomerId: ${stripeCustomerId}`,
    );
  }

  public async retrieveStripeCustomerId(userId: string): Promise<string> {
    this.logger.log(
      `Retrieving Stripe customer ID for user with ID: ${userId}`,
    );
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.stripe_cus_id;
  }

  public async updateProfilePicture(userId: string, image: string) {
    this.logger.log(`Updating profile picture for user with ID: ${userId}`);
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.profile_picture = image;
    this.logger.log(`Profile picture updated for user with ID: ${userId}`);
    return user.save();
  }

  public async getShippingAddresses(userId: string): Promise<Address[]> {
    this.logger.log(
      `Retrieving shipping addresses for user with ID: ${userId}`,
    );
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.shipping_addresses;
  }

  public async addShippingAddress(
    userId: string,
    newAddress: CreateAddressDto,
  ) {
    this.logger.log(`Adding shipping address for user with ID: ${userId}`);
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.shipping_addresses.push(newAddress);
    this.logger.log(`Shipping address added for user with ID: ${userId}`);
    return user.save().then((user) => user.shipping_addresses);
  }

  public async removeShippingAddress(userId: string, addressId: string) {
    this.logger.log(
      `Removing shipping address with ID: ${addressId} for user with ID: ${userId}`,
    );
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.shipping_addresses = user.shipping_addresses.filter(
      (address: AddressDocument) => address._id?.toString() !== addressId,
    );
    this.logger.log(
      `Shipping address with ID: ${addressId} removed for user with ID: ${userId}`,
    );
    return user.save().then((user) => user.shipping_addresses);
  }

  public async updateShippingAddress(
    userId: string,
    addressId: string,
    updatedAddress: UpdateAddressDto,
  ) {
    this.logger.log(
      `Updating shipping address with ID: ${addressId} for user with ID: ${userId}`,
    );
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const addressIndex = user.shipping_addresses.findIndex(
      (address: AddressDocument) => address._id?.toString() === addressId,
    );
    if (addressIndex === -1) {
      this.logger.error(`Address with ID ${addressId} not found`);
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    user.shipping_addresses[addressIndex] = Object.assign(
      user.shipping_addresses[addressIndex],
      updatedAddress,
    );
    this.logger.log(
      `Shipping address with ID: ${addressId} updated for user with ID: ${userId}`,
    );
    return user.save().then((user) => user.shipping_addresses);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAddressDto } from '@address/dto/create-address.dto';
import { UpdateAddressDto } from '@address/dto/update-address.dto';
import { Address, AddressDocument } from '@address/schemas/address.schema';

@Injectable()
export class AddressService {
  public constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  public async createAddress(
    createAddressDto: CreateAddressDto,
  ): Promise<Address> {
    const createdAddress = new this.addressModel(createAddressDto);
    return createdAddress.save();
  }

  public async getAllAddressesForUser(userId: string): Promise<Address[]> {
    return this.addressModel.find({ user: userId });
  }

  public async updateAddress(
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    const updatedAddress = await this.addressModel.findByIdAndUpdate(
      addressId,
      updateAddressDto,
      { new: true },
    );
    if (!updatedAddress) {
      throw new NotFoundException('Address not found');
    }
    return updatedAddress;
  }

  public async removeAddressAndReturnRemaining(
    userId: string,
    addressId: string,
  ): Promise<Address[]> {
    const deletedAddress = await this.addressModel.findByIdAndDelete(addressId);
    if (!deletedAddress) {
      throw new NotFoundException('Address not found');
    }
    return this.addressModel.find({ user: userId });
  }
}

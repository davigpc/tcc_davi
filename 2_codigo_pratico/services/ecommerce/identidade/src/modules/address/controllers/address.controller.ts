import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAddressDto } from '@address/dto/create-address.dto';
import { UpdateAddressDto } from '@address/dto/update-address.dto';
import { AddressService } from '@address/services/address.service';

@ApiTags('Adresses')
@Controller('address')
export class AddressController {
  public constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiBody({ type: CreateAddressDto })
  public async createNewAddress(@Body() createAddressDto: CreateAddressDto) {
    return this.addressService.createAddress(createAddressDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get all addresses for a user' })
  public async getAllUserAddresses(@Param('userId') userId: string) {
    return this.addressService.getAllAddressesForUser(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an address' })
  public async updateExistingAddress(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(id, updateAddressDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  public async deleteAddress(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressService.removeAddressAndReturnRemaining(userId, id);
  }
}

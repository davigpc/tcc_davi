import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { UserService } from '@user/services/user.service';
import { CreateAddressDto } from '@address/dto/create-address.dto';
import { UpdateAddressDto } from '@address/dto/update-address.dto';
import { LocalStorageService } from '@storages/services/local-storage.service';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  public constructor(
    private readonly localStorage: LocalStorageService,
    private readonly userService: UserService,
  ) {}

  @Put(':id/profile-picture')
  @ApiOperation({ summary: 'Update user profile picture' })
  @ApiBody({ type: UpdateUserDto })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profile_picture'))
  public async updateProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
  ) {
    const image = await this.localStorage.uploadSingleFile(file);
    return this.userService.updateProfilePicture(id, image);
  }

  @Put(':id/personal-details')
  @ApiOperation({ summary: 'Update user personal details' })
  @ApiBody({ type: UpdateUserDto })
  public async updatePersonalDetails(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, data);
  }

  @Get(':id/shipping-addresses')
  @ApiOperation({ summary: 'Get user shipping addresses' })
  public async getShippingAddresses(@Param('id') id: string) {
    return this.userService.getShippingAddresses(id);
  }

  @Post(':id/shipping-address')
  @ApiOperation({ summary: 'Add shipping address for a user' })
  @ApiBody({ type: CreateAddressDto })
  public async addShippingAddress(
    @Param('id') id: string,
    @Body() data: CreateAddressDto,
  ) {
    return this.userService.addShippingAddress(id, data);
  }

  @Put(':id/shipping-address/:addressId')
  @ApiOperation({ summary: 'Update shipping address for a user' })
  @ApiBody({ type: UpdateAddressDto })
  public async updateShippingAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() data: UpdateAddressDto,
  ) {
    return this.userService.updateShippingAddress(id, addressId, data);
  }

  @Delete(':id/shipping-address/:addressId')
  @ApiOperation({ summary: 'Delete shipping address for a user' })
  public async deleteShippingAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.userService.removeShippingAddress(id, addressId);
  }
}

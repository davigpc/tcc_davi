import { IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingOptions } from '@shipping/enums/shipping-options.enum';

export class AddShippingOptionsDto {
  @ApiProperty({
    description: 'List of shipping options',
    example: ['FLAT_RATE', 'TODAY_DELIVERY'],
    isArray: true,
    enum: ShippingOptions,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ShippingOptions, { each: true })
  shipping: ShippingOptions[];
}

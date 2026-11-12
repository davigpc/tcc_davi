import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingOptions } from '@shipping/enums/shipping-options.enum';

export class RemoveShippingOptionDto {
  @ApiProperty({
    description: 'Shipping option to be removed',
    example: 'FLAT_RATE',
    enum: ShippingOptions,
  })
  @IsEnum(ShippingOptions)
  @IsNotEmpty()
  shipping: ShippingOptions;
}

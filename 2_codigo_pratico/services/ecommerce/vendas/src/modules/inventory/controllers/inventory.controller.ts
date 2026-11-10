import { Controller } from '@nestjs/common';
import { InventoryService } from '@inventory/services/inventory.service';

@Controller('inventory')
export class InventoryController {
  public constructor(private readonly inventoryService: InventoryService) {}
}

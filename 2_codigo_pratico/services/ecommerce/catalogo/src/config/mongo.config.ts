import { ConfigService } from '@nestjs/config';

export default async (configService: ConfigService) => {
  return {
    uri: configService.get('MONGO_URI'),
    dbName: configService.get('MONGO_DATABASE'),
  };
};

import { Module } from '@nestjs/common';
import { MlbbController } from './mlbb.controller';
import { MlbbService } from './mlbb.service';

@Module({
  controllers: [MlbbController],
  providers: [MlbbService],
  exports: [MlbbService],
})
export class MlbbModule {}

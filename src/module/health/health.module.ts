import { Module } from '@nestjs/common';
import { HealthResolver } from './presentation/health.resolver.js';

@Module({
  providers: [HealthResolver],
})
export class HealthModule {}

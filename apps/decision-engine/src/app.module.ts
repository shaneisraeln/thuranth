import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';

// Entities
import { DecisionEntity } from './entities/decision.entity';
import { OverrideEntity } from './entities/override.entity';

// Controllers
import { DecisionController } from './controllers/decision.controller';
import { OverrideController } from './controllers/override.controller';

// Services
import { DecisionEngineService } from './services/decision-engine.service';
import { ConstraintEvaluatorService } from './services/constraint-evaluator.service';
import { RouteCalculatorService } from './services/route-calculator.service';
import { ScoringService } from './services/scoring.service';
import { ExplanationService } from './services/explanation.service';
import { ShadowModeService } from './services/shadow-mode.service';
import { OverrideAuthorizationService } from './services/override-authorization.service';
import { OverrideImpactService } from './services/override-impact.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([DecisionEntity, OverrideEntity]),
  ],
  controllers: [DecisionController, OverrideController],
  providers: [
    DecisionEngineService,
    ConstraintEvaluatorService,
    RouteCalculatorService,
    ScoringService,
    ExplanationService,
    ShadowModeService,
    OverrideAuthorizationService,
    OverrideImpactService,
  ],
  exports: [
    DecisionEngineService,
    ShadowModeService,
  ],
})
export class AppModule {}
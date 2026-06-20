import { Module } from "@nestjs/common";

import { ActivityFeedModule } from "./activity-feed/activity-feed.module";
import { AuthModule } from "./auth/auth.module";
import { AccountbookModule } from "./accountbook/accountbook.module";
import { AppreciationsModule } from "./appreciations/appreciations.module";
import { CalendarModule } from "./calendar/calendar.module";
import { FamilyEventsModule } from "./family-events/family-events.module";
import { FixedExpensesModule } from "./fixed-expenses/fixed-expenses.module";
import { HealthController } from "./health/health.controller";
import { FamiliesModule } from "./families/families.module";
import { HomeManualsModule } from "./home-manuals/home-manuals.module";
import { HouseholdItemsModule } from "./household-items/household-items.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductLinksModule } from "./product-links/product-links.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TemplatesModule } from "./templates/templates.module";
import { TodosModule } from "./todos/todos.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FamiliesModule,
    TemplatesModule,
    HouseholdItemsModule,
    ProductLinksModule,
    AccountbookModule,
    PurchasesModule,
    TodosModule,
    HomeManualsModule,
    FamilyEventsModule,
    FixedExpensesModule,
    CalendarModule,
    ActivityFeedModule,
    AppreciationsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AccountbookService } from "./accountbook.service";
import { AccountbookEntryIdParamDto } from "./dto/accountbook-entry-id-param.dto";
import { AccountbookFamilyParamDto } from "./dto/accountbook-family-param.dto";
import { CreateAccountEntryDto } from "./dto/create-account-entry.dto";
import { ListAccountEntriesQueryDto } from "./dto/list-account-entries-query.dto";
import { MonthlySummaryQueryDto } from "./dto/monthly-summary-query.dto";
import { UpdateAccountEntryDto } from "./dto/update-account-entry.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class AccountbookController {
  constructor(@Inject(AccountbookService) private readonly accountbookService: AccountbookService) {}

  @Get("families/:familyId/accountbook/categories")
  listCategories(@CurrentUser() user: CurrentUserPayload, @Param() params: AccountbookFamilyParamDto) {
    return this.accountbookService.listCategories(user, params.familyId);
  }

  @Post("families/:familyId/accountbook/entries")
  createEntry(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AccountbookFamilyParamDto,
    @Body() dto: CreateAccountEntryDto,
  ) {
    return this.accountbookService.createEntry(user, params.familyId, dto);
  }

  @Get("families/:familyId/accountbook/entries")
  listEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AccountbookFamilyParamDto,
    @Query() query: ListAccountEntriesQueryDto,
  ) {
    return this.accountbookService.listEntries(user, params.familyId, query);
  }

  @Get("accountbook/entries/:entryId")
  getEntry(@CurrentUser() user: CurrentUserPayload, @Param() params: AccountbookEntryIdParamDto) {
    return this.accountbookService.getEntry(user, params.entryId);
  }

  @Patch("accountbook/entries/:entryId")
  updateEntry(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AccountbookEntryIdParamDto,
    @Body() dto: UpdateAccountEntryDto,
  ) {
    return this.accountbookService.updateEntry(user, params.entryId, dto);
  }

  @Delete("accountbook/entries/:entryId")
  deleteEntry(@CurrentUser() user: CurrentUserPayload, @Param() params: AccountbookEntryIdParamDto) {
    return this.accountbookService.deleteEntry(user, params.entryId);
  }

  @Get("families/:familyId/accountbook/monthly-summary")
  getMonthlySummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AccountbookFamilyParamDto,
    @Query() query: MonthlySummaryQueryDto,
  ) {
    return this.accountbookService.getMonthlySummary(user, params.familyId, query);
  }
}

import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFixedExpenseDto } from "./dto/create-fixed-expense.dto";
import { CreateFixedExpensePaymentDto } from "./dto/create-fixed-expense-payment.dto";
import { FixedExpenseParamDto } from "./dto/fixed-expense-param.dto";
import { FixedExpensePaymentParamDto } from "./dto/fixed-expense-payment-param.dto";
import { FixedExpensesParamDto } from "./dto/fixed-expenses-param.dto";
import { ListFixedExpensesQueryDto } from "./dto/list-fixed-expenses-query.dto";
import { UpdateFixedExpenseRemindersDto } from "./dto/update-fixed-expense-reminders.dto";
import { UpdateFixedExpenseDto } from "./dto/update-fixed-expense.dto";
import { FixedExpensesService } from "./fixed-expenses.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class FixedExpensesController {
  constructor(@Inject(FixedExpensesService) private readonly fixedExpensesService: FixedExpensesService) {}

  @Get("families/:familyId/fixed-expenses")
  listFixedExpenses(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FixedExpensesParamDto,
    @Query() query: ListFixedExpensesQueryDto,
  ) {
    return this.fixedExpensesService.listFixedExpenses(user, params.familyId, query);
  }

  @Post("families/:familyId/fixed-expenses")
  createFixedExpense(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpensesParamDto, @Body() dto: CreateFixedExpenseDto) {
    return this.fixedExpensesService.createFixedExpense(user, params.familyId, dto);
  }

  @Get("fixed-expenses/:fixedExpenseId")
  getFixedExpense(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpenseParamDto) {
    return this.fixedExpensesService.getFixedExpense(user, params.fixedExpenseId);
  }

  @Patch("fixed-expenses/:fixedExpenseId")
  updateFixedExpense(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpenseParamDto, @Body() dto: UpdateFixedExpenseDto) {
    return this.fixedExpensesService.updateFixedExpense(user, params.fixedExpenseId, dto);
  }

  @Delete("fixed-expenses/:fixedExpenseId")
  deleteFixedExpense(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpenseParamDto) {
    return this.fixedExpensesService.deleteFixedExpense(user, params.fixedExpenseId);
  }

  @Get("fixed-expenses/:fixedExpenseId/reminders")
  listReminders(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpenseParamDto) {
    return this.fixedExpensesService.listReminders(user, params.fixedExpenseId);
  }

  @Put("fixed-expenses/:fixedExpenseId/reminders")
  updateReminders(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FixedExpenseParamDto,
    @Body() dto: UpdateFixedExpenseRemindersDto,
  ) {
    return this.fixedExpensesService.updateReminders(user, params.fixedExpenseId, dto);
  }

  @Post("fixed-expenses/:fixedExpenseId/payments")
  createPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: FixedExpenseParamDto,
    @Body() dto: CreateFixedExpensePaymentDto,
  ) {
    return this.fixedExpensesService.createPayment(user, params.fixedExpenseId, dto);
  }

  @Get("fixed-expenses/:fixedExpenseId/payments")
  listPayments(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpenseParamDto) {
    return this.fixedExpensesService.listPayments(user, params.fixedExpenseId);
  }

  @Get("fixed-expense-payments/:paymentId")
  getPayment(@CurrentUser() user: CurrentUserPayload, @Param() params: FixedExpensePaymentParamDto) {
    return this.fixedExpensesService.getPayment(user, params.paymentId);
  }
}

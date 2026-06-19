import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTodoCompletionDto } from "./dto/create-todo-completion.dto";
import { CreateTodoDto } from "./dto/create-todo.dto";
import { FamilyTodosParamDto } from "./dto/family-todos-param.dto";
import { ListTodosQueryDto } from "./dto/list-todos-query.dto";
import { TodoCompletionParamDto } from "./dto/todo-completion-param.dto";
import { TodoParamDto } from "./dto/todo-param.dto";
import { TodoScheduleDto } from "./dto/todo-schedule.dto";
import { UpdateTodoDto } from "./dto/update-todo.dto";
import { TodosService } from "./todos.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class TodosController {
  constructor(@Inject(TodosService) private readonly todosService: TodosService) {}

  @Get("families/:familyId/todos")
  listTodos(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyTodosParamDto, @Query() query: ListTodosQueryDto) {
    return this.todosService.listTodos(user, params.familyId, query);
  }

  @Post("families/:familyId/todos")
  createTodo(@CurrentUser() user: CurrentUserPayload, @Param() params: FamilyTodosParamDto, @Body() dto: CreateTodoDto) {
    return this.todosService.createTodo(user, params.familyId, dto);
  }

  @Get("todos/:todoId")
  getTodo(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto) {
    return this.todosService.getTodo(user, params.todoId);
  }

  @Patch("todos/:todoId")
  updateTodo(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto, @Body() dto: UpdateTodoDto) {
    return this.todosService.updateTodo(user, params.todoId, dto);
  }

  @Delete("todos/:todoId")
  deleteTodo(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto) {
    return this.todosService.deleteTodo(user, params.todoId);
  }

  @Get("todos/:todoId/schedule")
  getSchedule(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto) {
    return this.todosService.getSchedule(user, params.todoId);
  }

  @Put("todos/:todoId/schedule")
  upsertSchedule(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto, @Body() dto: TodoScheduleDto) {
    return this.todosService.upsertSchedule(user, params.todoId, dto);
  }

  @Delete("todos/:todoId/schedule")
  deleteSchedule(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto) {
    return this.todosService.deleteSchedule(user, params.todoId);
  }

  @Post("todos/:todoId/completions")
  createCompletion(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: TodoParamDto,
    @Body() dto: CreateTodoCompletionDto,
  ) {
    return this.todosService.createCompletion(user, params.todoId, dto);
  }

  @Get("todos/:todoId/completions")
  listCompletions(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoParamDto) {
    return this.todosService.listCompletions(user, params.todoId);
  }

  @Get("todo-completions/:completionId")
  getCompletion(@CurrentUser() user: CurrentUserPayload, @Param() params: TodoCompletionParamDto) {
    return this.todosService.getCompletion(user, params.completionId);
  }
}

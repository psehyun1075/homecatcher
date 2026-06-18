import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";

import { CurrentUser, CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApplyTemplateParamDto } from "./dto/apply-template-param.dto";
import { TemplateSetIdParamDto } from "./dto/template-set-id-param.dto";
import { TemplatesService } from "./templates.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class TemplatesController {
  constructor(@Inject(TemplatesService) private readonly templatesService: TemplatesService) {}

  @Get("templates")
  listTemplates() {
    return this.templatesService.listTemplates();
  }

  @Get("templates/:templateSetId")
  getTemplate(@Param() params: TemplateSetIdParamDto) {
    return this.templatesService.getTemplate(params.templateSetId);
  }

  @Post("families/:familyId/templates/:templateSetId/apply")
  applyTemplate(@CurrentUser() user: CurrentUserPayload, @Param() params: ApplyTemplateParamDto) {
    return this.templatesService.applyTemplate(user, params.familyId, params.templateSetId);
  }
}

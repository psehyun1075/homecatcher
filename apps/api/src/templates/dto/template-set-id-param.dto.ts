import { IsUUID } from "class-validator";

export class TemplateSetIdParamDto {
  @IsUUID("4", { message: "템플릿 정보가 올바르지 않아요." })
  templateSetId!: string;
}

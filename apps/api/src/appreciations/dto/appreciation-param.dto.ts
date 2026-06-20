import { IsUUID } from "class-validator";

export class AppreciationParamDto {
  @IsUUID("4", { message: "고마워요를 찾을 수 없어요." })
  appreciationId!: string;
}

import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateFamilyDto {
  @IsString({ message: "가족 이름을 입력해 주세요." })
  @MinLength(1, { message: "가족 이름을 입력해 주세요." })
  @MaxLength(40, { message: "가족 이름은 40자 이하로 입력해 주세요." })
  familyName!: string;
}

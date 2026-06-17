import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class SignupDto {
  @IsEmail({}, { message: "이메일 형식이 올바르지 않아요." })
  email!: string;

  @IsString({ message: "비밀번호를 입력해 주세요." })
  @MinLength(8, { message: "비밀번호는 8자 이상이어야 해요." })
  @MaxLength(72, { message: "비밀번호가 너무 길어요." })
  password!: string;

  @IsString({ message: "이름을 입력해 주세요." })
  @MinLength(2, { message: "이름은 2자 이상이어야 해요." })
  @MaxLength(20, { message: "이름은 20자 이하로 입력해 주세요." })
  name!: string;
}

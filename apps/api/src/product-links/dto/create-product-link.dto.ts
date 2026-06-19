import { IsBoolean, IsOptional, IsUrl, MaxLength } from "class-validator";

export class CreateProductLinkDto {
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
    },
    { message: "상품 URL을 확인해 주세요." },
  )
  @MaxLength(2000, { message: "상품 URL이 너무 길어요." })
  url!: string;

  @IsOptional()
  @IsBoolean({ message: "대표 상품 URL 여부를 다시 확인해 주세요." })
  isPrimary?: boolean;
}

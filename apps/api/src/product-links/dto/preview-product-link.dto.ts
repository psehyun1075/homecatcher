import { IsUrl, MaxLength } from "class-validator";

export class PreviewProductLinkDto {
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
    },
    { message: "상품 URL을 확인해 주세요." },
  )
  @MaxLength(2000, { message: "상품 URL이 너무 길어요." })
  url!: string;
}

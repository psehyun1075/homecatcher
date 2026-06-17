import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "home-catcher-api",
      appName: "홈캐처",
      version: "0.1.0",
    };
  }
}

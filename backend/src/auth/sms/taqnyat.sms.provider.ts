import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmsProvider, toIntlMobile } from "./sms.provider";

@Injectable()
export class TaqnyatSmsProvider extends SmsProvider {
  private readonly logger = new Logger(TaqnyatSmsProvider.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  override isLive(): boolean {
    return true;
  }

  async send(mobile: string, message: string): Promise<void> {
    const token = (this.config.get<string>("TAQNYAT_BEARER_TOKEN") ?? "").trim();
    const sender = (this.config.get<string>("TAQNYAT_SENDER") ?? "").trim();
    const base = (this.config.get<string>("TAQNYAT_BASE_URL") ?? "https://api.taqnyat.sa").replace(/\/$/, "");
    if (!token || !sender) {
      this.logger.error("Taqnyat is missing TAQNYAT_BEARER_TOKEN or TAQNYAT_SENDER");
      throw new BadRequestException("تعذر إرسال الرمز");
    }

    const recipient = toIntlMobile(mobile);
    if (!recipient) {
      throw new BadRequestException("تعذر إرسال الرمز");
    }

    let response: Response;
    try {
      response = await fetch(`${base}/v1/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          sender,
          recipients: [recipient],
          body: message,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(`Taqnyat request failed: ${error instanceof Error ? error.message : "network"}`);
      throw new BadRequestException("تعذر إرسال الرمز");
    }

    const payload = (await response.json().catch(() => null)) as
      | { statusCode?: number; message?: string; messageId?: number; rejected?: string }
      | null;
    const statusCode = payload?.statusCode ?? response.status;
    if (!response.ok || (statusCode !== 201 && statusCode !== 200)) {
      this.logger.error(`Taqnyat rejected SMS status=${statusCode} message=${payload?.message ?? response.statusText}`);
      throw new BadRequestException("تعذر إرسال الرمز");
    }

    this.logger.log(
      `Taqnyat accepted SMS id=${payload?.messageId ?? "n/a"} to=${recipient} body=${message.replace(/\d{4,8}/g, "******")}`,
    );
  }
}

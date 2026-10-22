export abstract class SmsProvider {
  abstract send(mobile: string, message: string): Promise<void>;
}

export class DevSmsProvider extends SmsProvider {
  async send(mobile: string, message: string) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[SMS] DevSmsProvider is active; OTP was not delivered to a gateway");
      return;
    }
    console.log(`[SMS:dev] to=${mobile} message=${message}`);
  }
}

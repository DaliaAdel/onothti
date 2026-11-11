export abstract class SmsProvider {
  abstract send(mobile: string, message: string): Promise<void>;

  isLive(): boolean {
    return false;
  }
}

export function toIntlMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("05") && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }
  if (digits.startsWith("966") && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith("00966")) {
    return digits.slice(2);
  }
  return digits.replace(/^\+/, "");
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

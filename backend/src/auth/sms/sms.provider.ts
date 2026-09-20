export abstract class SmsProvider {
  abstract send(mobile: string, message: string): Promise<void>;
}

export class DevSmsProvider extends SmsProvider {
  async send(mobile: string, message: string) {
    console.log(`[SMS:dev] to=${mobile} message=${message}`);
  }
}

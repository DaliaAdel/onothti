import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AccountStatus, AccountType, type AccountTypeValue } from "../common/enums";
import { createMariaAdapter } from "../database-url";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: createMariaAdapter() });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  nextAccountCode(type: AccountTypeValue, count: number) {
    const prefix = this.accountCodePrefix(type);
    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }

  async allocateAccountCode(type: AccountTypeValue) {
    const prefix = this.accountCodePrefix(type);
    const rows = await this.user.findMany({
      where: { accountType: type, accountCode: { startsWith: `${prefix}-` } },
      select: { accountCode: true },
    });
    let max = 0;
    for (const row of rows) {
      const n = Number(row.accountCode.slice(prefix.length + 1));
      if (Number.isFinite(n) && n > max) {
        max = n;
      }
    }
    return `${prefix}-${String(max + 1).padStart(6, "0")}`;
  }

  private accountCodePrefix(type: AccountTypeValue) {
    return type === AccountType.CUSTOMER ? "CU" : type === AccountType.PROVIDER ? "BM" : "ST";
  }

  isPubliclyVisible(input: {
    status: string;
    visibility?: string | null;
  }) {
    return (
      input.status === AccountStatus.ACTIVE && input.visibility === "PUBLIC"
    );
  }

  async getSetting(key: string, fallback = "") {
    const row = await this.setting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  }

  async getSettingInt(key: string, fallback: number) {
    const parsed = Number(await this.getSetting(key, String(fallback)));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}

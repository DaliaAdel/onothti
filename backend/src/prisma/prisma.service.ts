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
    const prefix =
      type === AccountType.CUSTOMER
        ? "CU"
        : type === AccountType.PROVIDER
          ? "BM"
          : "ST";
    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }

  isPubliclyVisible(input: {
    status: string;
    visibility?: string | null;
  }) {
    return (
      input.status === AccountStatus.ACTIVE && input.visibility === "PUBLIC"
    );
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AccountStatus, AccountType, type AccountTypeValue } from "../common/enums";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error("SQL Server is not ready yet", error);
    }
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

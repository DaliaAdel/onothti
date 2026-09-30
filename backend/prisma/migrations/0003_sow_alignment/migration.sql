-- AlterTable
ALTER TABLE `user`
    ADD COLUMN `termsAcceptedAt` DATETIME(0) NULL,
    ADD COLUMN `termsVersion` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_email_key` ON `user`(`email`);

-- CreateIndex
CREATE INDEX `user_accountType_displayName_idx` ON `user`(`accountType`, `displayName`);

-- AlterTable
ALTER TABLE `session`
    ADD COLUMN `deviceId` VARCHAR(80) NULL,
    ADD COLUMN `channel` VARCHAR(10) NOT NULL DEFAULT 'WEB',
    ADD COLUMN `revokedAt` DATETIME(0) NULL;

-- CreateIndex
CREATE INDEX `session_userId_deviceId_channel_idx` ON `session`(`userId`, `deviceId`, `channel`);

-- AlterTable
ALTER TABLE `providerprofile`
    ADD COLUMN `lastAppearedAt` DATETIME(0) NULL;

-- AlterTable
ALTER TABLE `providerservice`
    ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `priceFrom` DECIMAL(10, 2) NULL,
    ADD COLUMN `priceTo` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `notification`
    ADD COLUMN `type` VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN `ref` VARCHAR(80) NULL,
    ADD COLUMN `readAt` DATETIME(0) NULL;

-- CreateIndex
CREATE INDEX `notification_userId_createdAt_idx` ON `notification`(`userId`, `createdAt`);

-- CreateTable
CREATE TABLE `coveragearea` (
    `id` CHAR(36) NOT NULL,
    `cityId` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `coveragearea_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `providercoverage` (
    `providerUserId` CHAR(36) NOT NULL,
    `coverageAreaId` CHAR(36) NOT NULL,

    PRIMARY KEY (`providerUserId`, `coverageAreaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profilechangerequest` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `field` VARCHAR(40) NOT NULL,
    `oldValue` LONGTEXT NULL,
    `newValue` LONGTEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewedAt` DATETIME(0) NULL,

    INDEX `profilechangerequest_userId_status_idx`(`userId`, `status`),
    INDEX `profilechangerequest_field_status_idx`(`field`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `welcomemessage` (
    `id` CHAR(36) NOT NULL,
    `audience` VARCHAR(20) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `bodyAr` VARCHAR(400) NOT NULL,
    `bodyEn` VARCHAR(400) NOT NULL DEFAULT '',
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `coveragearea` ADD CONSTRAINT `coveragearea_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `providercoverage` ADD CONSTRAINT `providercoverage_coverageAreaId_fkey` FOREIGN KEY (`coverageAreaId`) REFERENCES `coveragearea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `providercoverage` ADD CONSTRAINT `providercoverage_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profilechangerequest` ADD CONSTRAINT `profilechangerequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

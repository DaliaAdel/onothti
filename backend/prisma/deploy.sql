-- CreateTable
CREATE TABLE IF NOT EXISTS `user` (
    `id` CHAR(36) NOT NULL,
    `accountType` VARCHAR(20) NOT NULL,
    `mobile` VARCHAR(10) NOT NULL,
    `email` VARCHAR(255) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'INACTIVE',
    `displayName` VARCHAR(120) NOT NULL,
    `accountCode` VARCHAR(20) NOT NULL,
    `avatarFileId` CHAR(36) NULL,
    `mobileVerifiedAt` DATETIME(0) NULL,
    `lastActiveAt` DATETIME(0) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `user_accountCode_key`(`accountCode`),
    INDEX `user_status_accountType_idx`(`status`, `accountType`),
    INDEX `user_accountCode_idx`(`accountCode`),
    UNIQUE INDEX `user_mobile_accountType_key`(`mobile`, `accountType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `role` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `permission` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `nameAr` VARCHAR(160) NOT NULL,
    `nameEn` VARCHAR(160) NOT NULL DEFAULT '',

    UNIQUE INDEX `permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rolepermission` (
    `roleId` CHAR(36) NOT NULL,
    `permissionId` CHAR(36) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `staffuser` (
    `userId` CHAR(36) NOT NULL,
    `roleId` CHAR(36) NOT NULL,
    `team` VARCHAR(40) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `customerprofile` (
    `userId` CHAR(36) NOT NULL,
    `cityId` CHAR(36) NULL,
    `interests` LONGTEXT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `providerprofile` (
    `userId` CHAR(36) NOT NULL,
    `bio` LONGTEXT NULL,
    `whatsapp` VARCHAR(20) NULL,
    `cityId` CHAR(36) NULL,
    `visibility` VARCHAR(20) NOT NULL DEFAULT 'HIDDEN',
    `badge` VARCHAR(40) NULL,

    INDEX `providerprofile_cityId_visibility_idx`(`cityId`, `visibility`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `session` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `device` VARCHAR(180) NULL,
    `refreshTokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(0) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `otprequest` (
    `id` CHAR(36) NOT NULL,
    `mobile` VARCHAR(10) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(0) NOT NULL,
    `lockedUntil` DATETIME(0) NULL,
    `verifiedAt` DATETIME(0) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `otprequest_mobile_purpose_createdAt_idx`(`mobile`, `purpose`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `bannedphone` (
    `mobile` VARCHAR(10) NOT NULL,
    `reason` VARCHAR(400) NOT NULL,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`mobile`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `accountstatushistory` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `fromStatus` VARCHAR(30) NOT NULL,
    `toStatus` VARCHAR(30) NOT NULL,
    `reason` VARCHAR(400) NULL,
    `actorId` CHAR(36) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `accountstatushistory_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `region` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `region_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `city` (
    `id` CHAR(36) NOT NULL,
    `regionId` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(80) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `city_code_key`(`code`),
    INDEX `city_isVisible_idx`(`isVisible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `service` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `iconFileId` CHAR(36) NULL,
    `imageFileId` CHAR(36) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `service_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `subservice` (
    `id` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `subservice_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `providerservice` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `subServiceId` CHAR(36) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `providerservice_providerUserId_serviceId_subServiceId_key`(`providerUserId`, `serviceId`, `subServiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `package` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(80) NOT NULL,
    `durationMonths` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `vatPercent` DECIMAL(5, 2) NOT NULL,
    `rank` INTEGER NOT NULL,
    `maxServices` INTEGER NULL,
    `maxPhotos` INTEGER NULL,
    `maxVideos` INTEGER NULL,
    `allowWhatsApp` BOOLEAN NOT NULL DEFAULT true,
    `allowRating` BOOLEAN NOT NULL DEFAULT true,
    `hasBadge` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `package_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `campaign` (
    `id` CHAR(36) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL DEFAULT '',
    `startDate` DATETIME(0) NOT NULL,
    `endDate` DATETIME(0) NOT NULL,
    `benefitDays` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `subscription` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `packageId` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NULL,
    `startAt` DATETIME(0) NOT NULL,
    `endAt` DATETIME(0) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    INDEX `subscription_providerUserId_status_endAt_idx`(`providerUserId`, `status`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `paymentproof` (
    `id` CHAR(36) NOT NULL,
    `subscriptionId` CHAR(36) NOT NULL,
    `fileId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `opsStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `financeStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `activatedAt` DATETIME(0) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `invoice` (
    `id` CHAR(36) NOT NULL,
    `proofId` CHAR(36) NOT NULL,
    `invoiceNo` VARCHAR(40) NOT NULL,
    `taxNo` VARCHAR(40) NULL,
    `issuedAt` DATETIME(0) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `vatAmount` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `invoice_proofId_key`(`proofId`),
    UNIQUE INDEX `invoice_invoiceNo_key`(`invoiceNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `bankaccount` (
    `id` CHAR(36) NOT NULL,
    `bankName` VARCHAR(120) NOT NULL,
    `iban` VARCHAR(34) NOT NULL,
    `accountName` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `mediafile` (
    `id` CHAR(36) NOT NULL,
    `storageKey` VARCHAR(400) NOT NULL,
    `mime` VARCHAR(80) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `uploadedById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `portfolioitem` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `fileId` CHAR(36) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `approvalStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `favorite` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NOT NULL,
    `targetType` VARCHAR(20) NOT NULL,
    `targetId` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `favorite_customerUserId_targetType_targetId_key`(`customerUserId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `recentview` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `viewedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `recentview_customerUserId_viewedAt_idx`(`customerUserId`, `viewedAt`),
    UNIQUE INDEX `recentview_customerUserId_providerUserId_key`(`customerUserId`, `providerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `profileviewdaily` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NULL,
    `cityId` CHAR(36) NULL,
    `viewDate` DATE NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `profileviewdaily_providerUserId_serviceId_cityId_viewDate_key`(`providerUserId`, `serviceId`, `cityId`, `viewDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `whatsappclick` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `searchlog` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `query` VARCHAR(200) NULL,
    `cityId` CHAR(36) NULL,
    `serviceId` CHAR(36) NULL,
    `resultCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rating` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `stars` INTEGER NOT NULL,
    `note` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `rating_providerUserId_status_idx`(`providerUserId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `tickettype` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(160) NOT NULL,
    `nameEn` VARCHAR(160) NOT NULL DEFAULT '',
    `audience` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `tickettype_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ticket` (
    `id` CHAR(36) NOT NULL,
    `refNo` VARCHAR(30) NOT NULL,
    `typeId` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `assigneeId` CHAR(36) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    `priority` INTEGER NOT NULL DEFAULT 3,
    `body` LONGTEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `ticket_refNo_key`(`refNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ticketcomment` (
    `id` CHAR(36) NOT NULL,
    `ticketId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `notification` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `audience` VARCHAR(20) NULL,
    `titleAr` VARCHAR(160) NOT NULL DEFAULT '',
    `titleEn` VARCHAR(160) NOT NULL DEFAULT '',
    `bodyAr` VARCHAR(800) NOT NULL DEFAULT '',
    `bodyEn` VARCHAR(800) NOT NULL DEFAULT '',
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `complaint` (
    `id` CHAR(36) NOT NULL,
    `reporterId` CHAR(36) NOT NULL,
    `targetUserId` CHAR(36) NULL,
    `targetRef` VARCHAR(80) NULL,
    `reason` VARCHAR(400) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `auditlog` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(50) NULL,
    `payload` LONGTEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `auditlog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `auditlog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `setting` (
    `key` VARCHAR(80) NOT NULL,
    `value` LONGTEXT NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `legalpage` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `titleAr` VARCHAR(160) NOT NULL,
    `titleEn` VARCHAR(160) NOT NULL DEFAULT '',
    `bodyAr` LONGTEXT NOT NULL,
    `bodyEn` LONGTEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `legalpage_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rolepermission` ADD CONSTRAINT `rolepermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolepermission` ADD CONSTRAINT `rolepermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staffuser` ADD CONSTRAINT `staffuser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `staffuser` ADD CONSTRAINT `staffuser_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `customerprofile` ADD CONSTRAINT `customerprofile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `customerprofile` ADD CONSTRAINT `customerprofile_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `providerprofile` ADD CONSTRAINT `providerprofile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `providerprofile` ADD CONSTRAINT `providerprofile_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bannedphone` ADD CONSTRAINT `bannedphone_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `accountstatushistory` ADD CONSTRAINT `accountstatushistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `accountstatushistory` ADD CONSTRAINT `accountstatushistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `city` ADD CONSTRAINT `city_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `region`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subservice` ADD CONSTRAINT `subservice_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `providerservice` ADD CONSTRAINT `providerservice_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `providerservice` ADD CONSTRAINT `providerservice_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `providerservice` ADD CONSTRAINT `providerservice_subServiceId_fkey` FOREIGN KEY (`subServiceId`) REFERENCES `subservice`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `package`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `paymentproof` ADD CONSTRAINT `paymentproof_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscription`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `paymentproof` ADD CONSTRAINT `paymentproof_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `mediafile`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `invoice_proofId_fkey` FOREIGN KEY (`proofId`) REFERENCES `paymentproof`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mediafile` ADD CONSTRAINT `mediafile_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `portfolioitem` ADD CONSTRAINT `portfolioitem_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolioitem` ADD CONSTRAINT `portfolioitem_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `mediafile`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `favorite` ADD CONSTRAINT `favorite_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recentview` ADD CONSTRAINT `recentview_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profileviewdaily` ADD CONSTRAINT `profileviewdaily_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profileviewdaily` ADD CONSTRAINT `profileviewdaily_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profileviewdaily` ADD CONSTRAINT `profileviewdaily_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `whatsappclick` ADD CONSTRAINT `whatsappclick_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `whatsappclick` ADD CONSTRAINT `whatsappclick_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `searchlog` ADD CONSTRAINT `searchlog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `searchlog` ADD CONSTRAINT `searchlog_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `searchlog` ADD CONSTRAINT `searchlog_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rating` ADD CONSTRAINT `rating_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rating` ADD CONSTRAINT `rating_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `tickettype`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticketcomment` ADD CONSTRAINT `ticketcomment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticketcomment` ADD CONSTRAINT `ticketcomment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint` ADD CONSTRAINT `complaint_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `complaint` ADD CONSTRAINT `complaint_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `auditlog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

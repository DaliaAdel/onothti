-- CreateTable
CREATE TABLE `User` (
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

    UNIQUE INDEX `User_accountCode_key`(`accountCode`),
    INDEX `User_status_accountType_idx`(`status`, `accountType`),
    INDEX `User_accountCode_idx`(`accountCode`),
    UNIQUE INDEX `User_mobile_accountType_key`(`mobile`, `accountType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `nameAr` VARCHAR(160) NOT NULL,

    UNIQUE INDEX `Permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` CHAR(36) NOT NULL,
    `permissionId` CHAR(36) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffUser` (
    `userId` CHAR(36) NOT NULL,
    `roleId` CHAR(36) NOT NULL,
    `team` VARCHAR(40) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerProfile` (
    `userId` CHAR(36) NOT NULL,
    `cityId` CHAR(36) NULL,
    `interests` LONGTEXT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderProfile` (
    `userId` CHAR(36) NOT NULL,
    `bio` LONGTEXT NULL,
    `whatsapp` VARCHAR(20) NULL,
    `cityId` CHAR(36) NULL,
    `visibility` VARCHAR(20) NOT NULL DEFAULT 'HIDDEN',
    `badge` VARCHAR(40) NULL,

    INDEX `ProviderProfile_cityId_visibility_idx`(`cityId`, `visibility`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `device` VARCHAR(180) NULL,
    `refreshTokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(0) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OtpRequest` (
    `id` CHAR(36) NOT NULL,
    `mobile` VARCHAR(10) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(0) NOT NULL,
    `lockedUntil` DATETIME(0) NULL,
    `verifiedAt` DATETIME(0) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `OtpRequest_mobile_purpose_createdAt_idx`(`mobile`, `purpose`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BannedPhone` (
    `mobile` VARCHAR(10) NOT NULL,
    `reason` VARCHAR(400) NOT NULL,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`mobile`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountStatusHistory` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `fromStatus` VARCHAR(30) NOT NULL,
    `toStatus` VARCHAR(30) NOT NULL,
    `reason` VARCHAR(400) NULL,
    `actorId` CHAR(36) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `AccountStatusHistory_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Region` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `Region_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` CHAR(36) NOT NULL,
    `regionId` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(80) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `City_code_key`(`code`),
    INDEX `City_isVisible_idx`(`isVisible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `iconFileId` CHAR(36) NULL,
    `imageFileId` CHAR(36) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Service_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubService` (
    `id` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SubService_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderService` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `subServiceId` CHAR(36) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ProviderService_providerUserId_serviceId_subServiceId_key`(`providerUserId`, `serviceId`, `subServiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
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

    UNIQUE INDEX `Package_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` CHAR(36) NOT NULL,
    `nameAr` VARCHAR(120) NOT NULL,
    `startDate` DATETIME(0) NOT NULL,
    `endDate` DATETIME(0) NOT NULL,
    `benefitDays` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `packageId` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NULL,
    `startAt` DATETIME(0) NOT NULL,
    `endAt` DATETIME(0) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    INDEX `Subscription_providerUserId_status_endAt_idx`(`providerUserId`, `status`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentProof` (
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
CREATE TABLE `Invoice` (
    `id` CHAR(36) NOT NULL,
    `proofId` CHAR(36) NOT NULL,
    `invoiceNo` VARCHAR(40) NOT NULL,
    `taxNo` VARCHAR(40) NULL,
    `issuedAt` DATETIME(0) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `vatAmount` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `Invoice_proofId_key`(`proofId`),
    UNIQUE INDEX `Invoice_invoiceNo_key`(`invoiceNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` CHAR(36) NOT NULL,
    `bankName` VARCHAR(120) NOT NULL,
    `iban` VARCHAR(34) NOT NULL,
    `accountName` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaFile` (
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
CREATE TABLE `PortfolioItem` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `fileId` CHAR(36) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `approvalStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NOT NULL,
    `targetType` VARCHAR(20) NOT NULL,
    `targetId` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Favorite_customerUserId_targetType_targetId_key`(`customerUserId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileViewDaily` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NULL,
    `cityId` CHAR(36) NULL,
    `viewDate` DATE NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ProfileViewDaily_providerUserId_serviceId_cityId_viewDate_key`(`providerUserId`, `serviceId`, `cityId`, `viewDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppClick` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchLog` (
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
CREATE TABLE `Rating` (
    `id` CHAR(36) NOT NULL,
    `customerUserId` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `stars` INTEGER NOT NULL,
    `note` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `Rating_providerUserId_status_idx`(`providerUserId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketType` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `nameAr` VARCHAR(160) NOT NULL,
    `audience` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `TicketType_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` CHAR(36) NOT NULL,
    `refNo` VARCHAR(30) NOT NULL,
    `typeId` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `assigneeId` CHAR(36) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    `priority` INTEGER NOT NULL DEFAULT 3,
    `body` LONGTEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Ticket_refNo_key`(`refNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketComment` (
    `id` CHAR(36) NOT NULL,
    `ticketId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `audience` VARCHAR(20) NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` VARCHAR(800) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complaint` (
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
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(50) NULL,
    `payload` LONGTEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(80) NOT NULL,
    `value` LONGTEXT NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LegalPage` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `titleAr` VARCHAR(160) NOT NULL,
    `bodyAr` LONGTEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `LegalPage_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffUser` ADD CONSTRAINT `StaffUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StaffUser` ADD CONSTRAINT `StaffUser_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CustomerProfile` ADD CONSTRAINT `CustomerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CustomerProfile` ADD CONSTRAINT `CustomerProfile_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProviderProfile` ADD CONSTRAINT `ProviderProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProviderProfile` ADD CONSTRAINT `ProviderProfile_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BannedPhone` ADD CONSTRAINT `BannedPhone_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AccountStatusHistory` ADD CONSTRAINT `AccountStatusHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AccountStatusHistory` ADD CONSTRAINT `AccountStatusHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SubService` ADD CONSTRAINT `SubService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProviderService` ADD CONSTRAINT `ProviderService_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `ProviderProfile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderService` ADD CONSTRAINT `ProviderService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProviderService` ADD CONSTRAINT `ProviderService_subServiceId_fkey` FOREIGN KEY (`subServiceId`) REFERENCES `SubService`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `Package`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PaymentProof` ADD CONSTRAINT `PaymentProof_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PaymentProof` ADD CONSTRAINT `PaymentProof_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `MediaFile`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_proofId_fkey` FOREIGN KEY (`proofId`) REFERENCES `PaymentProof`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `MediaFile` ADD CONSTRAINT `MediaFile_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `ProviderProfile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `MediaFile`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileViewDaily` ADD CONSTRAINT `ProfileViewDaily_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `ProviderProfile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileViewDaily` ADD CONSTRAINT `ProfileViewDaily_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProfileViewDaily` ADD CONSTRAINT `ProfileViewDaily_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `WhatsAppClick` ADD CONSTRAINT `WhatsAppClick_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `WhatsAppClick` ADD CONSTRAINT `WhatsAppClick_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SearchLog` ADD CONSTRAINT `SearchLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SearchLog` ADD CONSTRAINT `SearchLog_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SearchLog` ADD CONSTRAINT `SearchLog_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Rating` ADD CONSTRAINT `Rating_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;


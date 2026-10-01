-- AlterTable
ALTER TABLE `package`
    ADD COLUMN `maxAlbums` INTEGER NULL;

-- CreateTable
CREATE TABLE `portfolioalbum` (
    `id` CHAR(36) NOT NULL,
    `providerUserId` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `portfolioalbum_providerUserId_sortOrder_idx`(`providerUserId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `portfolioitem`
    ADD COLUMN `albumId` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `portfolioalbum`
    ADD CONSTRAINT `portfolioalbum_providerUserId_fkey`
    FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portfolioitem`
    ADD CONSTRAINT `portfolioitem_albumId_fkey`
    FOREIGN KEY (`albumId`) REFERENCES `portfolioalbum`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

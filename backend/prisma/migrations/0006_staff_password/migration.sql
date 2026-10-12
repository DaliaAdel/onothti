ALTER TABLE `user` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
UPDATE `user` SET `mustChangePassword` = true WHERE `accountType` = 'STAFF';

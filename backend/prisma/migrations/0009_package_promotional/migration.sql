ALTER TABLE `package` ADD COLUMN `isPromotional` BOOLEAN NOT NULL DEFAULT false;
UPDATE `package` p
INNER JOIN `campaign` c ON c.packageId = p.id
SET p.isPromotional = true;
UPDATE `package` SET isPromotional = true WHERE `nameAr` LIKE '%الوطن%';

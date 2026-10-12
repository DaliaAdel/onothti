ALTER TABLE `customerprofile` ADD COLUMN `bio` LONGTEXT NULL;
ALTER TABLE `rating` MODIFY `note` VARCHAR(500) NULL;
INSERT IGNORE INTO `setting` (`key`, `value`) VALUES
  ('idle_customer', '90 day'),
  ('idle_provider', '90 day'),
  ('provider_bio_max', '1000'),
  ('customer_bio_max', '300');
UPDATE `setting` SET `value` = '300' WHERE `key` = 'rating_note_max' AND `value` = '100';

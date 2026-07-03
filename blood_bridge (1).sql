-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 03, 2026 at 01:48 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `blood_bridge`
--
CREATE DATABASE IF NOT EXISTS `blood_bridge` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `blood_bridge`;

-- --------------------------------------------------------

--
-- Table structure for table `address`
--

DROP TABLE IF EXISTS `address`;
CREATE TABLE `address` (
  `id` int(11) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) NOT NULL,
  `address_line` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `address`
--

INSERT INTO `address` (`id`, `entity_type`, `entity_id`, `address_line`, `city`, `state`, `postal_code`, `country`, `latitude`, `longitude`) VALUES
(0, 'user', 26, '', '', '', '', 'Bangladesh', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `role` varchar(50) DEFAULT 'super admin',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_picture` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `email`, `password_hash`, `full_name`, `role`, `last_login`, `created_at`, `profile_picture`) VALUES
(4, 'admin@gmail.com', '$2y$10$EIHMgIOTYukuPAYrvmWsNOyhJpLhZF/L2FYs7jsmkREfPnzBr9/26', 'Admin', 'super admin', '2026-05-16 04:05:18', '2026-05-13 08:01:09', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `admin_warning`
--

DROP TABLE IF EXISTS `admin_warning`;
CREATE TABLE `admin_warning` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `target_type` enum('user','blood_bank') NOT NULL,
  `target_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `status` varchar(20) DEFAULT 'sent',
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL,
  `response` enum('accepted','rejected') DEFAULT NULL,
  `is_dismissed` tinyint(1) DEFAULT 0,
  `improvement_plan` text DEFAULT NULL,
  `admin_improvement_plan` text DEFAULT NULL,
  `admin_improvement_sent_at` datetime DEFAULT NULL,
  `appeal_reason` text DEFAULT NULL,
  `action_taken` enum('acknowledged','improvement_submitted','appealed') DEFAULT NULL,
  `blocked_at` timestamp NULL DEFAULT NULL,
  `suspicious_activity_log_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_warning`
--

INSERT INTO `admin_warning` (`id`, `admin_id`, `target_type`, `target_id`, `message`, `status`, `sent_at`, `responded_at`, `response`, `is_dismissed`, `improvement_plan`, `admin_improvement_plan`, `admin_improvement_sent_at`, `appeal_reason`, `action_taken`, `blocked_at`, `suspicious_activity_log_id`) VALUES
(72, 4, 'blood_bank', 7, 'Your BloodBridge blood bank rating is below 3.00 (2.00). Please improve service quality, stock handling, and compliance. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-05-24 15:20:50', '2026-06-02 11:38:26', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(76, 4, 'blood_bank', 7, 'Your BloodBridge blood bank rating is below 3.00 (2.00). Please improve service quality, stock handling, and compliance. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-06-03 09:32:32', '2026-06-03 06:00:43', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(82, 4, 'blood_bank', 6, 'Cool Down applied by admin. Reason: cool down done', 'cool_down', '2026-06-09 08:36:23', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(88, 4, 'user', 23, 'Cool Down applied by admin. Reason: cooldown done', 'cool_down', '2026-06-11 14:15:44', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(89, 4, 'user', 23, 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-06-11 14:56:05', '2026-06-11 14:58:03', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(90, 4, 'user', 23, 'Admin sent an improvement plan.', 'acknowledged', '2026-06-11 14:56:25', '2026-06-11 14:58:01', 'accepted', 1, NULL, 'Dear Kanik Deb,\n\nYour current trust score is 45, which is below the required threshold of 50. Here is a personalised improvement plan to help you restore your standing on BloodBridge:\n\n1. Complete Your Profile — Ensure your blood group, health details, and contact information are fully up to date.\n\n2. Honour Your Pledges — Avoid cancelling or missing scheduled donations. Each fulfilled pledge increases your trust score by +5.\n\n3. Respond Promptly to Requests — When you receive a blood request match, respond within 24 hours.\n\n4. Maintain Donation Regularity — Aim to donate at least once every 56 days (the standard safe interval).\n\n5. Avoid Suspicious Activity — Multiple pledge cancellations, mismatched health records, or repeated no-shows will further reduce your score.\n\nIf you believe your score was reduced in error, please submit an appeal through your dashboard. We are here to support you.\n\n— BloodBridge Admin Team', NULL, NULL, 'acknowledged', NULL, NULL),
(91, 4, 'user', 23, 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-06-11 19:06:27', '2026-06-11 15:07:28', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(92, 4, 'user', 23, 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-06-11 19:08:08', '2026-06-11 15:08:34', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(93, 4, 'user', 23, 'Your BloodBridge trust score is below 50 (30). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'acknowledged', '2026-06-13 09:34:13', '2026-06-13 09:21:55', 'accepted', 1, NULL, NULL, NULL, NULL, 'acknowledged', NULL, NULL),
(94, 4, 'user', 23, 'Account blocked. Reason: Blocked manually by admin from suspicious activity dashboard.', 'block_cancelled', '2026-06-13 13:19:28', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ai_model`
--

DROP TABLE IF EXISTS `ai_model`;
CREATE TABLE `ai_model` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `model_name` varchar(100) NOT NULL,
  `model_type` varchar(50) DEFAULT NULL,
  `framework` varchar(50) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `version` varchar(20) DEFAULT NULL,
  `hyperparameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`hyperparameters`)),
  `training_accuracy` decimal(5,4) DEFAULT NULL,
  `training_loss` decimal(10,6) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `trained_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `trained_by_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ai_prediction_log`
--

DROP TABLE IF EXISTS `ai_prediction_log`;
CREATE TABLE `ai_prediction_log` (
  `id` int(11) NOT NULL,
  `model_id` int(11) DEFAULT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `input_features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`input_features`)),
  `predicted_output` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`predicted_output`)),
  `actual_outcome` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actual_outcome`)),
  `confidence_score` decimal(5,4) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `predicted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `was_used` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `antibody_match_suggestion`
--

DROP TABLE IF EXISTS `antibody_match_suggestion`;
CREATE TABLE `antibody_match_suggestion` (
  `id` int(11) NOT NULL,
  `recipient_user_id` int(11) DEFAULT NULL,
  `suggested_donor_user_id` int(11) DEFAULT NULL,
  `compatibility_score` decimal(5,4) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `model_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `was_accepted` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `antibody_profile`
--

DROP TABLE IF EXISTS `antibody_profile`;
CREATE TABLE `antibody_profile` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `antibody_name` varchar(50) NOT NULL,
  `is_donor` tinyint(1) NOT NULL,
  `advice` text DEFAULT NULL,
  `detected_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_rule`
--

DROP TABLE IF EXISTS `approval_rule`;
CREATE TABLE `approval_rule` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `min_units` int(11) DEFAULT NULL,
  `required_approvals` int(11) DEFAULT NULL,
  `approver_roles` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_step`
--

DROP TABLE IF EXISTS `approval_step`;
CREATE TABLE `approval_step` (
  `id` int(11) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `approver_user_id` int(11) DEFAULT NULL,
  `step_order` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `comments` text DEFAULT NULL,
  `price_per_unit` decimal(10,2) DEFAULT NULL,
  `total_units` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `approval_step`
--

INSERT INTO `approval_step` (`id`, `entity_id`, `entity_type`, `approver_user_id`, `step_order`, `status`, `comments`, `price_per_unit`, `total_units`, `created_at`) VALUES
(1, 62, 'blood_request', 7, 1, 'approved', 'Blood bank has offered to fulfil this request.', NULL, NULL, '2026-05-25 10:09:00'),
(2, 66, 'blood_request', 7, 1, 'approved', 'Selected by requester — 2 unit(s) to be provided.', NULL, NULL, '2026-05-25 10:45:58'),
(3, 73, 'blood_request', 7, 1, 'approved', 'Selected by requester — 2 unit(s) to be provided.', NULL, NULL, '2026-05-25 11:43:40'),
(4, 75, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, NULL, '2026-05-25 12:25:04'),
(5, 76, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, NULL, '2026-05-25 12:27:11'),
(6, 78, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, NULL, '2026-05-25 16:43:47'),
(7, 79, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, NULL, '2026-05-25 16:45:56'),
(8, 1, 'blood_request', 15, 1, 'approved', '', NULL, NULL, '2026-05-26 18:14:50'),
(9, 80, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, 1, '2026-06-03 10:01:09'),
(10, 100, 'blood_request', 7, 1, 'approved', 'Selected by requester — 1 unit(s) to be provided.', NULL, 2, '2026-06-11 19:11:00'),
(11, 101, 'blood_request', 7, 1, 'pending', 'Blood bank has offered to fulfil this request.', NULL, 1, '2026-06-13 13:39:42');

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_data`)),
  `new_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_review`
--

DROP TABLE IF EXISTS `bank_review`;
CREATE TABLE `bank_review` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `reviewer_user_id` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `review_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bank_review`
--

INSERT INTO `bank_review` (`id`, `blood_bank_id`, `reviewer_user_id`, `rating`, `review_text`, `created_at`, `updated_at`) VALUES
(1, 4, 1, 2, '', '2026-05-15 03:41:04', '2026-05-15 03:41:04'),
(2, 7, 23, 2, '', '2026-05-23 15:57:03', '2026-05-24 18:37:12'),
(3, 7, 22, 4, '', '2026-05-24 18:37:29', '2026-05-24 18:37:29'),
(4, 7, 22, 4, '', '2026-05-24 18:37:36', '2026-05-24 18:37:36'),
(5, 7, 23, 4, '', '2026-05-25 16:57:17', '2026-05-25 16:57:17'),
(6, 7, 23, 5, '', '2026-06-09 10:41:35', '2026-06-09 10:41:35'),
(7, 7, 23, 3, '', '2026-06-09 10:41:47', '2026-06-09 10:41:47');

-- --------------------------------------------------------

--
-- Table structure for table `blood_bag`
--

DROP TABLE IF EXISTS `blood_bag`;
CREATE TABLE `blood_bag` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `bag_barcode` varchar(100) NOT NULL,
  `blood_group` varchar(5) NOT NULL,
  `donation_id` int(11) DEFAULT NULL,
  `volume_ml` int(11) DEFAULT 450,
  `collection_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiry_date` date NOT NULL,
  `status` varchar(30) DEFAULT 'available',
  `storage_location` varchar(100) DEFAULT NULL,
  `culture_test_status` varchar(20) DEFAULT 'pending',
  `quarantine_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blood_bag`
--

INSERT INTO `blood_bag` (`id`, `blood_bank_id`, `bag_barcode`, `blood_group`, `donation_id`, `volume_ml`, `collection_date`, `expiry_date`, `status`, `storage_location`, `culture_test_status`, `quarantine_reason`, `created_at`) VALUES
(1, 3, 'BB-1001', 'A+', NULL, 450, '2026-05-08 05:10:42', '2026-06-07', 'available', 'Freezer A1', 'pending', NULL, '2026-05-07 23:33:56'),
(2, 3, 'BB-1002', 'O-', NULL, 450, '2026-05-08 05:10:42', '2026-07-07', 'available', 'Freezer B2', 'pending', NULL, '2026-05-07 23:33:56'),
(3, 3, 'BB-1003', 'B+', NULL, 450, '2026-05-08 05:10:42', '2026-05-23', 'available', 'Freezer C3', 'pending', NULL, '2026-05-07 23:33:56'),
(8, 3, 'BB-2001', 'O+', NULL, 450, '2026-05-08 05:04:27', '2026-06-07', 'available', 'Freezer B2', 'pending', NULL, '2026-05-08 05:04:27'),
(9, 3, 'BB-DEMO-001', 'O+', NULL, 450, '2026-05-08 05:12:36', '2026-06-07', 'available', 'Freezer Demo', 'pending', NULL, '2026-05-08 05:12:36'),
(16, 7, 'BB-CF2C96F5', 'O+', 8, 450, '2026-05-16 02:19:33', '2026-06-27', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-16 02:19:33'),
(17, 7, 'BB-FFB8C1C9', 'O+', 9, 450, '2026-05-16 05:14:30', '2026-06-27', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-16 05:14:30'),
(18, 7, 'BB-2F35028C', 'O+', 10, 450, '2026-05-16 17:06:41', '2026-06-28', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-16 17:06:41'),
(79, 7, 'BB-D1993884', 'O+', 11, 450, '2026-05-19 13:07:18', '2026-06-30', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-19 13:07:18'),
(80, 7, 'BB-C6F4DB33', 'O+', 12, 450, '2026-05-20 12:02:10', '2026-07-01', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-20 12:02:10'),
(81, 1, 'TEST-BAG-1779354025', 'A+', NULL, 450, '2026-05-20 12:00:00', '2026-07-02', 'available', 'Freezer A1', 'pending', NULL, '2026-05-21 03:00:25'),
(82, 7, 'BB-67453D76', 'O+', 13, 450, '2026-05-21 03:23:33', '2026-07-02', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-21 03:23:33'),
(83, 7, 'BB-D997B560', 'B+', 14, 450, '2026-05-23 08:33:20', '2026-07-04', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-23 08:33:20'),
(84, NULL, 'BB20260524153733913', 'O+', NULL, 450, '2026-05-24 07:37:33', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 07:37:33'),
(86, 7, 'BB-7718D919', 'B+', 26, 450, '2026-05-24 19:22:30', '2026-07-05', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-24 19:22:30'),
(87, 7, 'BB-EF39E82E', 'B+', 27, 450, '2026-05-24 19:23:04', '2026-07-05', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-24 19:23:04'),
(88, 7, 'BB-191C013A', 'B+', 28, 450, '2026-05-24 19:23:45', '2026-07-05', 'reserved', 'Freezer A1', 'pending', NULL, '2026-05-24 19:23:45'),
(89, NULL, 'BB20260524213454473', 'B+', NULL, 450, '2026-05-24 19:34:54', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 19:34:54'),
(90, NULL, 'BB20260524214814965', 'B+', NULL, 450, '2026-05-24 19:48:14', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 19:48:14'),
(91, NULL, 'BB20260524215802893', 'B+', NULL, 450, '2026-05-24 19:58:02', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 19:58:02'),
(92, NULL, 'BB20260524220612958', 'B+', NULL, 450, '2026-05-24 20:06:12', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 20:06:12'),
(93, NULL, 'BB20260524222005401', 'B+', NULL, 450, '2026-05-24 20:20:05', '2026-07-05', 'used', NULL, 'negative', NULL, '2026-05-24 20:20:05'),
(94, NULL, 'BB20260524222009255', 'B+', NULL, 450, '2026-05-24 20:20:09', '2026-07-05', 'available', NULL, 'negative', NULL, '2026-05-24 20:20:09'),
(95, NULL, 'BB20260525072704672', 'O+', NULL, 450, '2026-05-25 05:27:04', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 05:27:04'),
(96, NULL, 'BB20260525082521226', 'B+', NULL, 450, '2026-05-25 06:25:21', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 06:25:21'),
(97, NULL, 'BB20260525082800647', 'B+', NULL, 450, '2026-05-25 06:28:00', '2026-07-06', 'available', NULL, 'negative', NULL, '2026-05-25 06:28:00'),
(98, NULL, 'BB20260525083020680', 'B+', NULL, 450, '2026-05-25 06:30:20', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 06:30:20'),
(99, NULL, 'BB20260525085718145', 'B+', NULL, 450, '2026-05-25 06:57:18', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 06:57:18'),
(100, NULL, 'BB20260525090000724', 'B+', NULL, 450, '2026-05-25 07:00:00', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 07:00:00'),
(101, NULL, 'BB20260525090940512', 'B+', NULL, 450, '2026-05-25 07:09:40', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 07:09:40'),
(102, NULL, 'BB20260525090943378', 'B+', NULL, 450, '2026-05-25 07:09:43', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 07:09:43'),
(103, NULL, 'BB20260525130924298', 'O+', NULL, 450, '2026-05-25 11:09:24', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:09:24'),
(104, NULL, 'BB20260525130927227', 'B+', NULL, 450, '2026-05-25 11:09:27', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:09:27'),
(105, NULL, 'BB20260525131259129', 'B+', NULL, 450, '2026-05-25 11:12:59', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:12:59'),
(106, NULL, 'BB20260525131302405', 'O+', NULL, 450, '2026-05-25 11:13:02', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:13:02'),
(107, NULL, 'BB20260525133045466', 'O+', NULL, 450, '2026-05-25 11:30:45', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:30:45'),
(108, NULL, 'BB20260525133048471', 'B+', NULL, 450, '2026-05-25 11:30:48', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:30:48'),
(109, NULL, 'BB20260525133807565', 'B+', NULL, 450, '2026-05-25 11:38:07', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:38:07'),
(110, NULL, 'BB20260525133810471', 'O+', NULL, 450, '2026-05-25 11:38:10', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 11:38:10'),
(111, NULL, 'BB20260525142228593', 'O+', NULL, 450, '2026-05-25 12:22:28', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 12:22:28'),
(112, NULL, 'BB20260525142232716', 'B+', NULL, 450, '2026-05-25 12:22:32', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 12:22:32'),
(113, 7, 'BB20260525142739813', 'O+', NULL, 450, '2026-05-25 12:27:39', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 12:27:39'),
(114, NULL, 'BB20260525183918260', 'O+', NULL, 450, '2026-05-25 16:39:18', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 16:39:18'),
(115, NULL, 'BB20260525183959156', 'B+', NULL, 450, '2026-05-25 16:39:59', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 16:39:59'),
(116, 7, 'BB20260525184721575', 'O+', NULL, 450, '2026-05-25 16:47:21', '2026-07-06', 'reserved', NULL, 'negative', NULL, '2026-05-25 16:47:21'),
(117, 7, 'BB20260525184802390', 'B+', NULL, 450, '2026-05-25 16:48:02', '2026-07-06', 'used', NULL, 'negative', NULL, '2026-05-25 16:48:02'),
(118, 7, 'BB20260603115932718', 'B+', NULL, 450, '2026-06-03 09:59:32', '2026-07-15', 'reserved', NULL, 'negative', NULL, '2026-06-03 09:59:32'),
(119, NULL, 'BB20260606104109164', 'O+', NULL, 450, '2026-06-06 08:41:09', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 08:41:09'),
(120, NULL, 'BB20260606104210146', 'O+', NULL, 450, '2026-06-06 08:42:10', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 08:42:10'),
(121, NULL, 'BB20260606111614780', 'B+', NULL, 450, '2026-06-06 09:16:14', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 09:16:14'),
(122, NULL, 'BB20260606111816233', 'O+', NULL, 450, '2026-06-06 09:18:16', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 09:18:16'),
(123, NULL, 'BB20260606141233134', 'O+', NULL, 450, '2026-06-06 12:12:33', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 12:12:33'),
(124, NULL, 'BB20260606141241843', 'B+', NULL, 450, '2026-06-06 12:12:41', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 12:12:41'),
(125, NULL, 'BB20260606155300139', 'B+', NULL, 450, '2026-06-06 13:53:00', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 13:53:00'),
(126, NULL, 'BB20260606155303882', 'O+', NULL, 450, '2026-06-06 13:53:03', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 13:53:03'),
(127, NULL, 'BB20260606161144502', 'O+', NULL, 450, '2026-06-06 14:11:44', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 14:11:44'),
(128, NULL, 'BB20260606161147635', 'B+', NULL, 450, '2026-06-06 14:11:47', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 14:11:47'),
(129, NULL, 'BB20260606165235285', 'B+', NULL, 450, '2026-06-06 14:52:35', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 14:52:35'),
(130, NULL, 'BB20260606172021110', 'B+', NULL, 450, '2026-06-06 15:20:21', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 15:20:21'),
(131, NULL, 'BB20260606172024443', 'O+', NULL, 450, '2026-06-06 15:20:24', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 15:20:24'),
(132, NULL, 'BB20260606191019980', 'O+', NULL, 450, '2026-06-06 17:10:19', '2026-07-18', 'used', NULL, 'negative', NULL, '2026-06-06 17:10:19'),
(133, NULL, 'BB20260606191022689', 'B+', NULL, 450, '2026-06-06 17:10:22', '2026-07-18', 'available', NULL, 'negative', NULL, '2026-06-06 17:10:22'),
(134, NULL, 'BB20260607131637182', 'O+', NULL, 450, '2026-06-07 11:16:37', '2026-07-19', 'available', NULL, 'negative', NULL, '2026-06-07 11:16:37'),
(135, NULL, 'BB20260607131644453', 'B+', NULL, 450, '2026-06-07 11:16:44', '2026-07-19', 'used', NULL, 'negative', NULL, '2026-06-07 11:16:44'),
(136, NULL, 'BB20260609123152719', 'B+', NULL, 450, '2026-06-09 10:31:52', '2026-07-21', 'available', NULL, 'negative', NULL, '2026-06-09 10:31:52'),
(137, NULL, 'BB20260609123942778', 'B+', NULL, 450, '2026-06-09 10:39:42', '2026-07-21', 'used', NULL, 'negative', NULL, '2026-06-09 10:39:42'),
(138, NULL, 'BB20260609125258813', 'B+', NULL, 450, '2026-06-09 10:52:58', '2026-07-21', 'used', NULL, 'negative', NULL, '2026-06-09 10:52:58'),
(139, NULL, 'BB20260610121632296', 'B+', NULL, 450, '2026-06-10 10:16:32', '2026-07-22', 'used', NULL, 'negative', NULL, '2026-06-10 10:16:32'),
(140, 7, 'BB-1F6D03BF', 'B+', 29, 450, '2026-06-10 14:04:41', '2026-07-22', 'reserved', 'Freezer A1', 'pending', NULL, '2026-06-10 14:04:41'),
(141, NULL, 'BB20260611181855128', 'B+', NULL, 450, '2026-06-11 16:18:55', '2026-07-23', 'used', NULL, 'negative', NULL, '2026-06-11 16:18:55'),
(142, NULL, 'BB20260611184348294', 'B+', NULL, 450, '2026-06-11 16:43:48', '2026-07-23', 'used', NULL, 'negative', NULL, '2026-06-11 16:43:48'),
(143, 7, 'BB-B78A23DA', 'B+', 30, 450, '2026-06-11 17:20:18', '2026-07-23', 'available', 'Freezer A1', 'pending', NULL, '2026-06-11 17:20:18'),
(144, 7, 'BB-A2AF499F', 'B+', 31, 450, '2026-06-11 17:22:03', '2026-07-23', 'available', 'Freezer A1', 'pending', NULL, '2026-06-11 17:22:03'),
(145, NULL, 'BB20260611193154749', 'B+', NULL, 450, '2026-06-11 17:31:54', '2026-07-23', 'used', NULL, 'negative', NULL, '2026-06-11 17:31:54'),
(146, 7, 'BB-D76EDCA1', 'B+', 32, 450, '2026-06-11 19:09:31', '2026-07-23', 'reserved', 'Freezer A1', 'pending', NULL, '2026-06-11 19:09:31'),
(147, 7, 'BB20260611211409143', 'B+', NULL, 450, '2026-06-11 19:14:09', '2026-07-23', 'used', NULL, 'negative', NULL, '2026-06-11 19:14:09'),
(148, 7, 'BB20260613153447869', 'B+', NULL, 450, '2026-06-13 13:34:47', '2026-07-25', 'used', NULL, 'negative', NULL, '2026-06-13 13:34:47'),
(149, 7, 'BB-0AA96765', 'B+', 33, 450, '2026-06-13 13:36:18', '2026-07-25', 'available', 'Freezer A1', 'pending', NULL, '2026-06-13 13:36:18');

-- --------------------------------------------------------

--
-- Table structure for table `blood_bank`
--

DROP TABLE IF EXISTS `blood_bank`;
CREATE TABLE `blood_bank` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `registration_no` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('blood_bank','hospital','medical_college') DEFAULT NULL,
  `address_line` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Bangladesh',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `rating_avg` decimal(3,2) DEFAULT 0.00,
  `status` varchar(20) DEFAULT 'active',
  `blocked_at` datetime DEFAULT NULL,
  `block_expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `profile_picture` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blood_bank`
--

INSERT INTO `blood_bank` (`id`, `name`, `registration_no`, `email`, `phone`, `password_hash`, `role`, `address_line`, `city`, `state`, `postal_code`, `country`, `latitude`, `longitude`, `rating_avg`, `status`, `blocked_at`, `block_expires_at`, `created_at`, `updated_at`, `profile_picture`) VALUES
(1, 'Dhaka Central Blood Bank', 'BB-DHK-0421', 'admin@dhakacentral.bd', '+880-2-9887654', '$2y$10$JfpXIqzYMbQix/UBTY7kW.4Z7VAIBnwxacRkc/KT2OPIFkPmWft4W', 'blood_bank', '32 Hospital Road', 'Dhaka', 'Dhaka', '1205', 'Bangladesh', 23.81030000, 90.41250000, 4.70, 'active', NULL, NULL, '2026-05-08 04:52:51', '2026-06-08 07:42:22', NULL),
(2, 'alpha', 'REG-1010', 'r@gmail.com', '01857682285', '$2y$10$rliBa3Kfl66ZDmcDQPsqWe/su/80BGtu25eRGjWr/TrUCyeVr2Bvm', 'blood_bank', 'Badda', 'Dhaka', 'Sayednagar', '10000', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-08 05:10:53', '2026-05-08 05:10:53', NULL),
(3, 'beta', 'REG-2052', 'rat@gmail.com', '01252665264', '$2y$10$MRjrIvJBT5Y7FYBko1oWxeg3C8jJiVQcK83KxHRhquOjwfQGBq4ii', 'blood_bank', 'kaharol', 'Dinajpur', 'Sayednagar', '2000', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-08 10:22:51', '2026-06-09 09:14:19', NULL),
(4, 'a', 'REG-10136', 'b@gmail.com', '0222525525652', '$2y$10$Pt/8E.s2A3VtA8KmxcDGP.V9uMfwHuq0rjXDmsMXHe9vO8SABemFm', 'blood_bank', 'Badd', 'Dhhjhbhbhjb', 'nb vb bnb', '1000', 'Bangladesh', NULL, NULL, 2.00, 'active', NULL, NULL, '2026-05-08 23:20:32', '2026-05-15 03:41:04', NULL),
(5, 'D medica;', 'REG-15663', 'm@gmail.com', '02146262625625', '$2y$10$44WzfxyP7CPoRekhL9P.6ePnYURvqiCpc9dslmH.lajZ02z5gj2Tq', 'medical_college', 'hbhdhshcjdhj', 'Dhaka', 'Dhaka Division', '10020', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-10 08:52:40', '2026-05-10 08:52:40', NULL),
(6, 'BLOODBANK', 'REG-7895647', 'bloodbank@gmail.com', '0165634526', '$2y$10$iehSrTBtwinrc5Khrf3TL.3ql7/Ha3Sm/GRCqdvUJAfoXhCWwHgx6', 'blood_bank', 'Dhaka', 'Dhaka', 'Dhaka', '3210', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-15 04:56:47', '2026-05-15 04:56:47', NULL),
(7, 'bank', 'REG-123456', 'bank@gmail.com', '0176735462', '$2y$10$RI7LA27bzlE7J7AKtli3cedpjrq7vxwFD5ntDY52bBMLX6wAKagWm', 'blood_bank', 'Dhaka', 'Dhaka', 'Dhaka', '3210', 'Bangladesh', NULL, NULL, 2.00, 'active', NULL, NULL, '2026-05-15 05:25:26', '2026-06-09 09:15:10', NULL),
(8, 'hospital', 'REG-12365', 'hospital@gmail.com', '97823621354', '$2y$10$Hq/fMuVUorZ68l990ParWeymMXiXoiQb73XSFnztbDUqAHQaXAziS', 'hospital', 'Dhaka', 'Dhaka', 'Dhaka', '3210', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-15 05:26:53', '2026-05-15 05:26:53', NULL),
(9, 'medical', 'REG-789', 'medical@gmail.com', '01765473655', '$2y$10$iCqYAPRUnsqUmwlSyA1QT.VwGo1NP.tjFD2Zgk949piA6lVut.VIe', 'medical_college', 'Dhaka', 'Dhaka', 'Dhaka', '3210', 'Bangladesh', NULL, NULL, 0.00, 'active', NULL, NULL, '2026-05-15 05:28:46', '2026-05-15 05:28:46', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `blood_culture_test`
--

DROP TABLE IF EXISTS `blood_culture_test`;
CREATE TABLE `blood_culture_test` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `blood_bag_id` int(11) DEFAULT NULL,
  `lab_technician_id` int(11) DEFAULT NULL,
  `test_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `result` varchar(20) NOT NULL,
  `pathogen_detected` varchar(100) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `donor_price` decimal(10,2) DEFAULT NULL,
  `price_accepted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blood_culture_test`
--

INSERT INTO `blood_culture_test` (`id`, `donor_user_id`, `request_id`, `blood_bag_id`, `lab_technician_id`, `test_date`, `result`, `pathogen_detected`, `comments`, `status`, `donor_price`, `price_accepted`, `created_at`) VALUES
(3, 22, 47, 85, 8, '2026-05-24 18:09:55', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 00:08:45'),
(4, 22, 50, 89, 8, '2026-05-24 19:34:54', 'negative', NULL, 'Sample is clean', 'approved', NULL, 0, '2026-05-25 01:34:14'),
(5, 22, 51, 90, 8, '2026-05-24 19:48:15', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 01:47:47'),
(6, 22, 52, 91, 8, '2026-05-24 19:58:02', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 01:57:36'),
(7, 22, 53, 92, 8, '2026-05-24 20:06:12', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 02:05:29'),
(8, 22, 49, 94, 8, '2026-05-24 20:20:09', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 02:13:53'),
(9, 22, 54, 93, 8, '2026-05-24 20:20:05', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 02:19:35'),
(10, 2, 55, 95, 8, '2026-05-25 05:27:04', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 11:19:06'),
(11, 23, 56, 96, 8, '2026-05-25 06:25:22', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 11:32:03'),
(12, 23, 57, 97, 8, '2026-05-25 06:28:00', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', NULL, 0, '2026-05-25 12:27:30'),
(13, 23, 58, 98, 8, '2026-05-25 06:30:20', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', NULL, 0, '2026-05-25 12:29:55'),
(14, 22, 58, 99, 8, '2026-05-25 06:57:18', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 12:56:36'),
(15, 22, 57, 100, 8, '2026-05-25 07:00:00', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 12:59:32'),
(16, 23, 59, 102, 8, '2026-05-25 07:09:43', 'negative', NULL, 'Request fully fulfilled by other donors.', 'approved', NULL, 0, '2026-05-25 13:08:50'),
(17, 22, 59, 101, 8, '2026-05-25 07:09:40', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 13:09:15'),
(18, 22, 67, 104, 8, '2026-05-25 11:09:27', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', NULL, 0, '2026-05-25 17:08:09'),
(19, 2, 67, 103, 8, '2026-05-25 11:09:24', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:08:56'),
(20, 2, 68, 106, 8, '2026-05-25 11:13:02', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:11:55'),
(21, 22, 68, 105, 8, '2026-05-25 11:12:59', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:12:12'),
(22, 22, 69, 108, 8, '2026-05-25 11:30:48', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:30:05'),
(23, 2, 69, 107, 8, '2026-05-25 11:30:45', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:30:35'),
(24, 2, 70, 110, 8, '2026-05-25 11:38:10', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:37:28'),
(25, 22, 70, 109, 8, '2026-05-25 11:38:07', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 17:37:59'),
(26, 22, 74, 112, 8, '2026-05-25 12:22:32', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 18:21:24'),
(27, 2, 74, 111, 8, '2026-05-25 12:22:28', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 18:22:02'),
(28, 2, 76, 113, 8, '2026-05-25 12:27:39', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 18:27:00'),
(29, 22, 77, 115, 8, '2026-05-25 16:39:59', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 22:37:34'),
(30, 2, 77, 114, 8, '2026-05-25 16:39:18', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 22:38:30'),
(31, 22, 79, 117, 8, '2026-05-25 16:48:02', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 22:46:31'),
(32, 2, 79, 116, 8, '2026-05-25 16:47:21', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-05-25 22:47:04'),
(33, 23, 80, 118, 8, '2026-06-03 09:59:32', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-06-03 15:57:50'),
(34, 2, 82, 120, 8, '2026-06-06 08:42:10', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', NULL, 0, '2026-06-03 21:42:24'),
(35, 2, 83, 119, 8, '2026-06-06 08:41:09', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-06 14:40:03'),
(36, 19, 84, NULL, 8, '2026-06-06 09:16:14', 'negative', NULL, 'Donor did not come.', 'rejected', 500.00, 0, '2026-06-06 15:15:45'),
(37, 2, 84, NULL, 8, '2026-06-06 09:18:16', 'negative', NULL, 'Donor did not come.', 'rejected', 500.00, 0, '2026-06-06 15:17:57'),
(38, 19, 84, NULL, 8, '2026-06-06 12:12:41', 'negative', NULL, 'Donor did not come.', 'rejected', 500.00, 0, '2026-06-06 18:11:33'),
(39, 2, 84, 123, 8, '2026-06-06 12:12:33', 'negative', NULL, NULL, 'approved', 500.00, 1, '2026-06-06 18:12:02'),
(40, 2, 85, 126, 8, '2026-06-06 13:53:03', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', 550.00, 0, '2026-06-06 19:52:18'),
(41, 19, 85, 125, 8, '2026-06-06 13:53:00', 'negative', NULL, 'Approved by lab technician.', 'approved', 550.00, 1, '2026-06-06 19:52:37'),
(42, 19, 86, 128, 8, '2026-06-06 14:11:47', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-06 20:10:45'),
(43, 2, 86, 127, 8, '2026-06-06 14:11:44', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', 500.00, 0, '2026-06-06 20:11:08'),
(44, 23, 82, 129, 8, '2026-06-06 14:52:35', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 1, '2026-06-06 20:52:07'),
(45, 2, 88, 131, 8, '2026-06-06 15:20:24', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', 500.00, 0, '2026-06-06 21:19:19'),
(46, 19, 88, 130, 8, '2026-06-06 15:20:21', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-06 21:20:00'),
(47, 19, 89, NULL, 8, '2026-06-06 17:10:22', 'negative', NULL, 'Donor did not come.', 'rejected', 500.00, 0, '2026-06-06 23:09:25'),
(48, 2, 89, 132, 8, '2026-06-06 17:10:19', 'negative', NULL, NULL, 'approved', 500.00, 1, '2026-06-06 23:09:48'),
(49, 19, 90, 135, 8, '2026-06-07 11:16:44', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-07 17:15:34'),
(50, 2, 90, 134, 8, '2026-06-07 11:16:37', 'negative', NULL, 'Request fully fulfilled by other donors.', 'rejected', 500.00, 0, '2026-06-07 17:16:03'),
(51, 19, 91, 136, 8, '2026-06-09 10:31:52', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-06-09 16:24:30'),
(52, 19, 92, 137, 8, '2026-06-09 10:39:42', 'negative', NULL, 'Approved by lab technician.', 'approved', 2000.00, 1, '2026-06-09 16:39:24'),
(53, 19, 93, 138, 8, '2026-06-09 10:52:58', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-09 16:52:47'),
(54, 26, 94, 139, 8, '2026-06-10 10:16:32', 'negative', NULL, 'Approved by lab technician.', 'approved', NULL, 0, '2026-06-10 16:15:27'),
(55, 23, 6, NULL, NULL, '2026-06-10 14:46:46', '', NULL, NULL, 'pending', NULL, 0, '2026-06-10 20:46:46'),
(56, 23, 97, 141, 8, '2026-06-11 16:18:55', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-11 22:18:08'),
(57, 23, 98, 142, 8, '2026-06-11 16:43:48', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 0, '2026-06-11 22:43:03'),
(58, 19, 99, 145, 8, '2026-06-11 17:31:54', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-11 23:30:52'),
(59, 19, 100, 147, 8, '2026-06-11 19:14:09', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 1, '2026-06-12 01:13:34'),
(60, 19, 101, 148, 8, '2026-06-13 13:34:47', 'negative', NULL, 'Approved by lab technician.', 'approved', 500.00, 0, '2026-06-13 19:33:26');

-- --------------------------------------------------------

--
-- Table structure for table `blood_request`
--

DROP TABLE IF EXISTS `blood_request`;
CREATE TABLE `blood_request` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `requester_user_id` int(11) DEFAULT NULL,
  `hospital_id` int(11) DEFAULT NULL,
  `blood_group` varchar(5) NOT NULL,
  `units_required` int(11) NOT NULL,
  `units_fulfilled` int(11) NOT NULL DEFAULT 0,
  `urgency` varchar(20) DEFAULT 'normal',
  `hospital_priority` enum('low','normal','high','critical') DEFAULT 'normal',
  `blood_component` enum('whole_blood','prbc','platelets','plasma','cryoprecipitate') DEFAULT 'whole_blood',
  `delivery_method` enum('pickup','ambulance','drone') DEFAULT 'pickup',
  `status` varchar(30) DEFAULT 'pending',
  `request_hash` varchar(255) DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `required_by` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by_user_id` int(11) DEFAULT NULL,
  `approved_by_bank_id` int(11) DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `visible_to` varchar(30) DEFAULT 'both',
  `request_type` enum('free','paid','open') NOT NULL DEFAULT 'free',
  `max_price_per_unit` decimal(10,2) DEFAULT NULL,
  `payment_status` enum('not_required','pending','paid','failed') NOT NULL DEFAULT 'not_required',
  `location_lat` decimal(10,7) DEFAULT NULL,
  `location_lng` decimal(11,7) DEFAULT NULL,
  `location_label` varchar(500) DEFAULT NULL,
  `request_city` varchar(100) DEFAULT NULL,
  `parent_request_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blood_request`
--

INSERT INTO `blood_request` (`id`, `blood_bank_id`, `requester_user_id`, `hospital_id`, `blood_group`, `units_required`, `units_fulfilled`, `urgency`, `hospital_priority`, `blood_component`, `delivery_method`, `status`, `request_hash`, `requested_at`, `required_by`, `approved_at`, `approved_by_user_id`, `approved_by_bank_id`, `delivered_at`, `notes`, `visible_to`, `request_type`, `max_price_per_unit`, `payment_status`, `location_lat`, `location_lng`, `location_label`, `request_city`, `parent_request_id`) VALUES
(1, NULL, 1, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '9EBF135FD9', '2026-05-17 12:02:41', '2026-05-19 12:00:00', '2026-05-26 18:14:50', NULL, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 23.7949416, 90.4356074, 'Bhandari Mor,  East Nurer Chala,  Nurer Chala', NULL, NULL),
(2, 7, 1, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '6553EEC557', '2026-05-19 03:38:30', '2026-05-21 12:00:00', '2026-05-21 08:51:39', NULL, 7, NULL, '', 'both', 'free', NULL, 'not_required', 23.7983962, 90.4498786, 'United International University Playground,  UIU Road,  United City', NULL, NULL),
(28, 3, 1, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'drone', 'approved', 'BLOOD-2026-05-20-13917CEA', '2026-05-20 16:35:23', NULL, NULL, NULL, NULL, NULL, NULL, 'both', 'free', NULL, 'not_required', NULL, NULL, NULL, NULL, NULL),
(29, 7, 1, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '8B32EBE732', '2026-05-20 18:03:38', '2026-05-22 18:00:00', '2026-05-20 18:03:38', NULL, NULL, NULL, '', 'both', 'free', NULL, 'not_required', 23.7949857, 90.4356736, 'Bhandari Mor,  East Nurer Chala,  Nurer Chala', 'Dhaka', NULL),
(61, 3, 2, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '8595DA5B57', '2026-05-25 09:33:03', '2026-05-27 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', 60),
(62, 7, 2, NULL, 'O+', 2, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '84707F8825', '2026-05-25 10:08:15', '2026-05-27 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 14.3365210, 121.0771100, 'Santo Domingo,  Biñan,  Laguna', 'Biñan', 62),
(63, 3, 2, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', 'F7BFF5C2D3', '2026-05-25 10:08:15', '2026-05-27 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 14.3365210, 121.0771100, 'Santo Domingo,  Biñan,  Laguna', 'Biñan', 62),
(64, 3, 2, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '630378FF41', '2026-05-25 10:40:02', '2026-05-27 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', 64),
(65, 7, 2, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '1A90E4A204', '2026-05-25 10:40:02', '2026-05-27 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', 64),
(66, 7, 2, NULL, 'O+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'E5D5FCC1E0', '2026-05-25 10:45:36', '2026-05-27 18:00:00', '2026-05-25 10:46:11', NULL, 7, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 14.3365210, 121.0771100, 'Santo Domingo,  Biñan,  Laguna', 'Biñan', NULL),
(67, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '292E070CA8', '2026-05-25 11:07:50', '2026-05-28 18:00:00', '2026-05-25 11:09:55', 2, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(68, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '9E8B66DA9E', '2026-05-25 11:11:35', '2026-05-28 18:00:00', '2026-05-25 11:29:04', 22, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(69, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'D5319FF42C', '2026-05-25 11:29:49', '2026-05-27 18:00:00', '2026-05-25 11:36:43', 2, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(70, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '7FCF06AD4F', '2026-05-25 11:37:14', '2026-05-28 18:00:00', '2026-05-25 11:38:30', 22, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(71, 7, 23, NULL, 'O+', 2, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', 'B718315690', '2026-05-25 11:39:10', '2026-05-28 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', 71),
(72, 3, 23, NULL, 'O+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '7781992428', '2026-05-25 11:39:10', '2026-05-28 18:00:00', NULL, NULL, NULL, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', 71),
(73, 7, 23, NULL, 'O+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'DE12B4D270', '2026-05-25 11:43:13', '2026-05-28 18:00:00', '2026-05-25 11:44:22', NULL, 7, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3085920, 91.7222370, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(74, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'D93DF89B39', '2026-05-25 12:21:11', '2026-05-27 18:00:00', '2026-05-25 12:22:47', 2, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(75, 7, 23, NULL, 'O+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '83AFFFB928', '2026-05-25 12:24:30', '2026-05-29 18:00:00', '2026-05-25 12:25:16', NULL, 7, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(76, 7, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'A33C7990D9', '2026-05-25 12:26:42', '2026-05-27 18:00:00', '2026-05-25 12:28:00', NULL, 7, NULL, '', 'both', 'free', NULL, 'not_required', 24.3085940, 91.7222290, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(77, NULL, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'C90768E44C', '2026-05-25 16:36:11', '2026-05-28 18:00:00', '2026-05-25 16:41:01', 2, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(78, 7, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '660CBF4131', '2026-05-25 16:43:07', '2026-05-27 18:00:00', '2026-05-25 16:44:26', NULL, 7, NULL, '', 'blood_bank', 'free', NULL, 'not_required', 24.3100000, 91.7300000, 'Sreemangal Upazila,  Moulvibazar District,  Sylhet Division', 'Sreemangal Upazila', NULL),
(79, 7, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'delivered', 'E76B0E5364', '2026-05-25 16:45:29', '2026-05-27 18:00:00', '2026-05-25 16:49:17', NULL, 7, '2026-05-26 18:32:25', '', 'both', 'free', NULL, 'not_required', 24.3085920, 91.7222370, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(80, 7, 2, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', 'BBB1264422', '2026-06-03 09:56:42', '2026-06-10 18:00:00', '2026-06-03 10:02:00', NULL, 7, NULL, '', 'both', 'free', NULL, 'not_required', 24.3085920, 91.7222370, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(81, 7, 2, NULL, 'O+', 2, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '5007C4EBBB', '2026-06-03 15:28:51', '2026-06-10 18:00:00', NULL, NULL, NULL, NULL, '', 'both', 'open', 480.00, 'not_required', 24.3085920, 91.7222370, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(82, NULL, 22, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'F06FBEB5F6', '2026-06-03 15:38:08', '2026-06-10 18:00:00', '2026-06-06 14:53:05', 23, NULL, NULL, '', 'donor_recipient', 'open', 400.00, 'paid', 24.3085920, 91.7222370, 'Sabujbagh Road,  Sreemangal Upazila,  Moulvibazar District', 'Sreemangal Upazila', NULL),
(83, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '58531EF134', '2026-06-06 08:39:04', '2026-06-07 18:00:00', '2026-06-06 08:43:06', 2, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7983993, 90.4500170, 'United International University,  UIU Entrance Road,  United City', 'Badda', NULL),
(84, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '1B3E449E54', '2026-06-06 09:14:14', '2026-06-08 18:00:00', '2026-06-06 12:13:37', 2, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7984061, 90.4500412, 'United International University,  UIU Entrance Road,  United City', 'Badda', NULL),
(85, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '3D8EE64182', '2026-06-06 12:45:57', '2026-06-22 18:00:00', '2026-06-06 13:53:38', 19, NULL, NULL, '', 'donor_recipient', 'paid', 550.00, 'paid', 23.7905545, 90.4350941, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(86, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'F6FB033592', '2026-06-06 14:10:20', '2026-06-24 18:00:00', '2026-06-06 14:12:12', 19, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7905604, 90.4351024, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(87, NULL, 23, NULL, 'B+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'DE4A034F08', '2026-06-06 14:23:32', '2026-06-17 18:00:00', NULL, NULL, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7904430, 90.4348980, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(88, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '5AD6F67258', '2026-06-06 15:03:00', '2026-06-15 18:00:00', '2026-06-06 15:20:55', 19, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7905526, 90.4351724, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(89, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'C71AF22B74', '2026-06-06 17:08:45', '2026-06-16 18:00:00', '2026-06-06 17:12:57', 2, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7905547, 90.4350497, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(90, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '577985046A', '2026-06-07 11:14:53', '2026-06-24 18:00:00', '2026-06-07 11:17:27', 19, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7903309, 90.4346817, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(91, NULL, 23, NULL, 'B+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '34089BEB91', '2026-06-09 10:08:30', '2026-06-10 18:00:00', NULL, NULL, NULL, NULL, '', 'donor_recipient', 'open', 500.00, 'not_required', 23.7983906, 90.4499903, 'United International University,  UIU Entrance Road,  United City', 'Badda', NULL),
(92, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'F7AD3442EC', '2026-06-09 10:34:07', '2026-06-10 18:00:00', '2026-06-09 10:42:55', 19, NULL, NULL, '', 'donor_recipient', 'open', 2000.00, 'paid', 23.7983583, 90.4499163, 'United International University,  Madani Avenue,  United City', 'Badda', NULL),
(93, NULL, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '352B69B629', '2026-06-09 10:46:08', '2026-06-10 18:00:00', '2026-06-09 10:53:29', 19, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7983926, 90.4499504, 'United International University,  UIU Entrance Road,  United City', 'Badda', NULL),
(94, NULL, 19, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '1611619AB5', '2026-06-10 10:14:22', '2026-06-11 18:00:00', '2026-06-10 10:16:50', 26, NULL, NULL, '', 'donor_recipient', 'free', NULL, 'not_required', 23.7983621, 90.4499654, 'United International University,  UIU Entrance Road,  United City', 'Dhaka', NULL),
(95, 3, 28, NULL, 'B+', 1, 0, 'normal', 'normal', 'whole_blood', 'drone', 'approved', 'BLOOD-2026-06-11-48448BC3', '2026-06-11 12:39:04', NULL, NULL, NULL, NULL, NULL, NULL, 'both', 'free', NULL, 'not_required', NULL, NULL, NULL, NULL, NULL),
(96, NULL, 28, NULL, 'B+', 1, 0, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '5813F0224C', '2026-06-11 12:54:07', '2026-06-12 18:00:00', NULL, NULL, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'not_required', 23.7958707, 90.4374351, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(97, NULL, 19, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', 'F36A3EA95B', '2026-06-11 16:17:37', '2026-06-17 18:00:00', '2026-06-11 16:19:51', 23, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7958415, 90.4372333, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(98, NULL, 19, NULL, 'B+', 2, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'pending', '34024DE8BE', '2026-06-11 16:34:55', '2026-06-12 18:00:00', NULL, NULL, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'not_required', 23.7958492, 90.4373268, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(99, NULL, 28, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '337D58446E', '2026-06-11 17:24:15', '2026-06-13 18:00:00', '2026-06-11 17:32:53', 19, NULL, NULL, '', 'donor_recipient', 'paid', 500.00, 'paid', 23.7958035, 90.4373381, 'East Nurer Chala,  Nurer Chala,  Dhaka', 'Dhaka', NULL),
(100, 7, 23, NULL, 'B+', 2, 2, 'normal', 'normal', 'whole_blood', 'pickup', 'completed', '62F155FDA6', '2026-06-11 19:10:46', '2026-06-12 18:00:00', '2026-06-11 19:14:38', NULL, 7, NULL, '', 'both', 'paid', 500.00, 'paid', 23.7949557, 90.4356517, 'Bhandari Mor,  East Nurer Chala,  Nurer Chala', 'Dhaka', NULL),
(101, 7, 23, NULL, 'B+', 1, 1, 'normal', 'normal', 'whole_blood', 'pickup', 'approved', '39BB362B1C', '2026-06-13 13:27:25', '2026-06-14 18:00:00', '2026-06-13 13:42:26', 19, NULL, NULL, '', 'both', 'paid', 500.00, 'not_required', 23.7983526, 90.4497986, 'United International University,  UIU Entrance Road,  United City', 'Dhaka', NULL);

--
-- Triggers `blood_request`
--
DROP TRIGGER IF EXISTS `trg_blood_request_after_insert`;
DELIMITER $$
CREATE TRIGGER `trg_blood_request_after_insert` AFTER INSERT ON `blood_request` FOR EACH ROW BEGIN
    DECLARE v_prev_hash VARCHAR(255) DEFAULT '0';
    DECLARE v_data_string VARCHAR(500);
    DECLARE v_new_hash VARCHAR(255);
    
    SET v_data_string = CONCAT(NEW.id, '|', NEW.status, '|', NOW(), '|', 'system', '|', RAND());
    SET v_new_hash = UPPER(SHA2(CONCAT(v_prev_hash, '|', v_data_string), 256));
    
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_blood_request_after_update`;
DELIMITER $$
CREATE TRIGGER `trg_blood_request_after_update` AFTER UPDATE ON `blood_request` FOR EACH ROW BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO request_timeline (request_id, status, changed_at, remarks)
        VALUES (NEW.id, NEW.status, NOW(), CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_blood_request_before_insert`;
DELIMITER $$
CREATE TRIGGER `trg_blood_request_before_insert` BEFORE INSERT ON `blood_request` FOR EACH ROW BEGIN
    IF NEW.request_hash IS NULL THEN
        SET NEW.request_hash = CONCAT('BLOOD-', DATE_FORMAT(NOW(), '%Y-%m-%d-'), 
            UPPER(SUBSTRING(SHA2(CONCAT(NOW(), NEW.requester_user_id, NEW.blood_group, RAND()), 256), 1, 8)));
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_blood_request_drone_dispatch`;
DELIMITER $$
CREATE TRIGGER `trg_blood_request_drone_dispatch` AFTER UPDATE ON `blood_request` FOR EACH ROW BEGIN
    IF NEW.status = 'approved' AND NEW.delivery_method = 'drone' AND (OLD.status != 'approved' OR OLD.delivery_method != 'drone') THEN
        CALL sp_auto_dispatch_drone(NEW.id);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `chat_log`
--

DROP TABLE IF EXISTS `chat_log`;
CREATE TABLE `chat_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `sender` enum('user','bot') NOT NULL,
  `intent_detected` varchar(50) DEFAULT NULL,
  `sentiment_score` decimal(4,3) DEFAULT NULL,
  `session_duration_sec` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_log`
--

INSERT INTO `chat_log` (`id`, `user_id`, `session_id`, `message`, `sender`, `intent_detected`, `sentiment_score`, `session_duration_sec`, `created_at`) VALUES
(1, 16, 'CHAT-16', 'hi', 'user', 'user_input', NULL, NULL, '2026-05-20 04:57:20'),
(2, 1, 'CHAT-1', 'hello, what can you help me with?', 'user', 'user_input', NULL, NULL, '2026-05-21 07:17:03'),
(3, 1, 'CHAT-1', 'Hello! *warm smile* It\'s lovely to meet you. I\'m here to help with anything you need, whether it\'s about your health, a personal issue, or just something you\'re curious about. What\'s been on your mind lately? What would you like to talk about?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:17:03'),
(4, 1, 'CHAT-1', 'I feel so depressed', 'user', 'user_input', NULL, NULL, '2026-05-21 07:17:55'),
(5, 1, 'CHAT-1', 'I\'m so sorry to hear that you\'re feeling depressed. That can be a really tough and isolating experience. Would you like to talk about what\'s been going on and how you\'ve been feeling? Sometimes sharing what\'s on your mind with someone (or in this case, a friendly AI like me) can help you feel a bit better.\n\nRemember, I\'m here to listen without judgment, and I won\'t try to offer any solutions unless you want me to. I just want to be a supportive presence and help you feel heard.\n\nIf you\'re not comfortable talking about it, that\'s okay too. We can just chat about something else that might take your mind off things. What do you think?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:17:55'),
(6, 1, 'CHAT-1', 'By the way, who are you?', 'user', 'user_input', NULL, NULL, '2026-05-21 07:18:11'),
(7, 1, 'CHAT-1', 'Nice to introduce myself properly. I\'m Raktosathi, a friendly AI assistant. My name is a combination of two words in Bengali - \"Rakto\" meaning blood, and \"Sathi\" meaning friend. I specialize in helping people with blood donation and healthcare-related topics, but I\'m happy to chat about anything that\'s on your mind. I\'m here to listen, offer support, and help in any way I can.\n\nSo, how are you feeling today? Want to talk about what\'s been going on?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:18:11'),
(8, 1, 'CHAT-1', 'Can I donate if I have a tattoo or piercing?', 'user', 'user_input', NULL, NULL, '2026-05-21 07:19:19'),
(9, 1, 'CHAT-1', 'Having a tattoo or piercing doesn\'t necessarily prevent you from donating blood, but there are some guidelines to follow.\n\nIn the UK, for example, if you have a tattoo or piercing, you\'ll need to wait a certain amount of time before you can donate. Typically, this is 6 months for tattoos and 3-6 months for piercings, depending on the type of piercing and whether it\'s a body piercing or an ear piercing.\n\nHowever, it\'s always best to check with the specific blood donation center or organization you\'re working with, as their policies might vary. They\'ll be able to give you the most up-to-date and accurate information.\n\nIt\'s also worth noting that if you\'ve had a tattoo or piercing in the past, but it\'s been a long time, you might still be eligible to donate. But like I said, it\'s always best to check with the donation center first.\n\nDo you have any tattoos or piercings that might affect your ability to donate?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:19:19'),
(10, 1, 'CHAT-1', 'What about Bangladesh?', 'user', 'user_input', NULL, NULL, '2026-05-21 07:19:47'),
(11, 1, 'CHAT-1', 'আপনি বাংলাদেশের কাছে প্রশ্ন করছেন। তাই আমি বাংলাদেশের ব্লাড ডোনেশনের নিয়মাবলী বিশেষ করে ট্যাটু বা পারিংয়ের ক্ষেত্রে বলব।\n\nবাংলাদেশের ব্লাড ব্যাংকের নিয়মানুসারে, যদি আপনার কোনো ট্যাটু বা পারিংয় থাকে, তাহলে আপনাকে অনুমতি দেওয়ার আগে পূর্বেকার মেডিকেল রিপোর্ট দেখা হবে। যদি ট্যাটু বা পারিংয়ের ব্যাপারে কোনো সমস্যা না থাকে, আপনি ডোনেশন করতে পারবেন। তবে, এটি ব্লাড ব্যাংকের কর্মকর্তার সিদ্ধান্ত নেয়ার উপর নির্ভর করে।\n\nসুতরাং, আপনি যদি ট্যাটু বা পারিংয়ের সমস্যায় না থাকেন, তাহলে আপনি বাংলাদেশের ব্লাড ব্যাংককে ফ', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:19:49'),
(12, 1, 'CHAT-1', 'I can\'t understand the last line', 'user', 'user_input', NULL, NULL, '2026-05-21 07:20:51'),
(13, 1, 'CHAT-1', 'এটি আমার বাংলা উত্তরের শেষ লাইন। এটি আমার একটি ভুল ছিল। এখানে সঠিক উত্তরটি:\n\nসুতরাং, আপনি যদি ট্যাটু বা পারিংয়ের সমস্যায় না থাকেন, তাহলে আমাদের বলতে হবে যে আপনি ব্লাড ডোনেশন করতে পারবেন।', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:20:52'),
(14, 1, 'CHAT-1', 'Tell me in english about the condition in Bangladesh?', 'user', 'user_input', NULL, NULL, '2026-05-21 07:21:46'),
(15, 1, 'CHAT-1', 'In Bangladesh, the guidelines for blood donation after getting a tattoo or piercing are similar to other countries. According to the Bangladesh National Blood Policy, if you have a tattoo or piercing, you will need to wait for a certain period of time before you can donate blood.\n\nThe Blood Transfusion Services of Bangladesh (BTSB) recommends that individuals with tattoos or piercings should be evaluated on a case-by-case basis. If the tattoo or piercing is considered to be a low-risk procedure, and there is no evidence of infection or other complications, then you may be eligible to donate blood.\n\nHowever, if the tattoo or piercing is considered to be a high-risk procedure, or if there is a history of infection or other complications, then you may be deferred from donating blood for a certain period of time.\n\nIt\'s also worth noting that the BTSB has specific guidelines for different types of tattoos and piercings, including:\n\n* Tattoos: 6 months deferral period\n* Piercings: 3-6 months deferral period\n* Multiple piercings or tattoos: individual evaluation required\n\nIt\'s always best to check with the specific blood donation center or hospital where you plan to donate blood, as their policies may vary.', 'bot', 'ai_response', NULL, NULL, '2026-05-21 07:21:46'),
(16, 2, 'CHAT-2', 'Hello', 'user', 'user_input', NULL, NULL, '2026-05-21 08:05:10'),
(17, 2, 'CHAT-2', 'Shubho Dine! (Good morning!) Nice to meet you. Is there something I can help you with today?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 08:05:11'),
(18, 10, 'CHAT-10', 'Hi', 'user', 'user_input', NULL, NULL, '2026-05-21 14:00:47'),
(19, 10, 'CHAT-10', 'Shubho din! আপনার সমস্যা কি? আমি এখানে আপনার সাহায্যের জন্য। (Hello! What\'s your problem? I\'m here to help you.)', 'bot', 'ai_response', NULL, NULL, '2026-05-21 14:00:48'),
(20, 10, 'CHAT-10', 'Who are you?', 'user', 'user_input', NULL, NULL, '2026-05-21 14:00:56'),
(21, 10, 'CHAT-10', 'I\'m Raktosathi, a friendly and helpful AI assistant. I\'m here to assist you with any questions or concerns you may have. I have a special focus on blood donation and healthcare, but I\'m happy to chat about anything that\'s on your mind. What brings you here today?', 'bot', 'ai_response', NULL, NULL, '2026-05-21 14:00:57'),
(22, 10, 'CHAT-10', 'Who can donate blood?', 'user', 'user_input', NULL, NULL, '2026-05-21 17:21:29'),
(23, 10, 'CHAT-10', 'Blood donation is a wonderful act of kindness that can save lives. Almost anyone can donate blood, but there are some basic requirements and guidelines to follow.\n\nTo be eligible to donate blood, you typically need to:\n\n1. Be at least 17 years old (16 years old with parental consent in some places)\n2. Weigh at least 110 pounds\n3. Be in good overall health\n4. Not have any blood-borne infections, such as HIV, hepatitis, or malaria\n5. Not have any cancer or blood disorders\n6. Not be taking certain medications, such as antibiotics or steroids\n7. Have a valid government-issued ID\n8. Not have traveled to certain countries within the past 12-24 months (depending on the country\'s risk level for blood-borne diseases)\n\nIt\'s also recommended that you:\n\n* Eat a good meal before donating (but not a heavy meal)\n* Drink plenty of water to stay hydrated\n* Avoid caffeine and nicotine before donating\n* Bring a friend or family member to accompany you during the donation process\n\nKeep in mind that these are general guidelines, and the specific requirements may vary depending on the blood bank or donation center. It\'s always best to check with the organization you\'re planning to donate to for their specific eligibility criteria.\n\nIf you\'re interested in donating blood, I\'d be happy to help you find a location near you or provide more information on the process!', 'bot', 'ai_response', NULL, NULL, '2026-05-21 17:21:31'),
(24, 2, 'CHAT-2', 'yes how are you', 'user', 'user_input', NULL, NULL, '2026-05-24 08:57:15'),
(25, 2, 'CHAT-2', 'Aap ki bhi shubhkamnayein! (Best wishes to you too!) I\'m doing great, thank you for asking. Just here to assist and help with any questions or concerns you may have. How about you, how\'s your day going so far?', 'bot', 'ai_response', NULL, NULL, '2026-05-24 08:57:16'),
(26, 23, 'CHAT-23', 'Who can donate blood?', 'user', 'user_input', NULL, NULL, '2026-06-03 10:06:30'),
(27, 23, 'CHAT-23', 'Donating blood is a wonderful act of kindness, and I\'m happy to tell you more about it. In general, most healthy individuals can donate blood, but there are some guidelines to follow.\n\nTo be eligible to donate blood, you should:\n\n1. **Be at least 17 years old** (in some places, the minimum age is 18 or 19) and have parental consent if you\'re younger.\n2. **Weigh at least 110 pounds** (50 kilograms).\n3. **Be in good overall health** and feel well on the day of donation.\n4. **Not have donated blood in the past 56 days** (8 weeks) for whole blood, or within 16 weeks for platelets or plasma.\n5. **Not have traveled to certain areas** where malaria or other diseases are present.\n6. **Not be pregnant or breastfeeding**.\n7. **Not have certain medical conditions**, such as cancer, HIV, or hepatitis.\n8. **Have a valid government-issued ID**.\n\nIt\'s also essential to eat a nutritious meal, stay hydrated, and get a good night\'s sleep before donating. Some medications can also disqualify you from donating, so it\'s best to check with a healthcare professional or the blood bank.\n\nRemember, donating blood is a safe process that can help save lives. If you\'re unsure about your eligibility, it\'s always best to consult with a healthcare professional or the blood bank.\n\nAre you considering donating blood, or would you like to know more about the process?', 'bot', 'ai_response', NULL, NULL, '2026-06-03 10:06:32');

-- --------------------------------------------------------

--
-- Table structure for table `crossmatch_test`
--

DROP TABLE IF EXISTS `crossmatch_test`;
CREATE TABLE `crossmatch_test` (
  `id` int(11) NOT NULL,
  `blood_bag_id` int(11) NOT NULL,
  `recipient_user_id` int(11) NOT NULL,
  `test_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `major_crossmatch` enum('compatible','incompatible','pending') DEFAULT 'pending',
  `minor_crossmatch` enum('compatible','incompatible','pending') DEFAULT 'pending',
  `antibody_screen` varchar(255) DEFAULT NULL,
  `tested_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_staff`
--

DROP TABLE IF EXISTS `delivery_staff`;
CREATE TABLE `delivery_staff` (
  `user_id` int(11) NOT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `license_no` varchar(100) DEFAULT NULL,
  `assigned_zone` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `delivery_staff`
--

INSERT INTO `delivery_staff` (`user_id`, `vehicle_type`, `license_no`, `assigned_zone`, `created_at`) VALUES
(9, 'Ambulance', 'BRTA-6565', 'Dhaka south', '2026-05-09 11:10:09'),
(13, 'Bicycle', 'BRTA-1234', 'Dhaka', '2026-05-13 23:04:07'),
(17, 'Motorcycle', 'BRTA-1234', 'Dhaka', '2026-05-15 05:24:35'),
(20, 'Van', 'BRTA-6565', 'Dhaka South', '2026-05-22 10:46:29');

-- --------------------------------------------------------

--
-- Table structure for table `demand_forecast`
--

DROP TABLE IF EXISTS `demand_forecast`;
CREATE TABLE `demand_forecast` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `forecast_date` date NOT NULL,
  `blood_group` varchar(5) NOT NULL,
  `predicted_units` decimal(8,2) DEFAULT NULL,
  `lower_bound` decimal(8,2) DEFAULT NULL,
  `upper_bound` decimal(8,2) DEFAULT NULL,
  `model_id` int(11) DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctor`
--

DROP TABLE IF EXISTS `doctor`;
CREATE TABLE `doctor` (
  `user_id` int(11) NOT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `license_no` varchar(100) DEFAULT NULL,
  `hospital_affiliation` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor`
--

INSERT INTO `doctor` (`user_id`, `specialization`, `license_no`, `hospital_affiliation`, `created_at`) VALUES
(15, 'General Practitioner', '', 'BloodBridge Medical Network', '2026-05-26 18:14:09'),
(18, 'Cardiologist', 'BMDC-1234', 'National heart foundation', '2026-05-20 03:22:22'),
(25, 'Psycology', 'BMDC-12565', 'Ibne Sinha', '2026-06-07 10:36:45');

-- --------------------------------------------------------

--
-- Table structure for table `donation`
--

DROP TABLE IF EXISTS `donation`;
CREATE TABLE `donation` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `donation_promise_id` int(11) DEFAULT NULL,
  `donation_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `health_check_notes` text DEFAULT NULL,
  `haemoglobin_level` decimal(4,2) DEFAULT NULL,
  `pulse` int(11) DEFAULT NULL,
  `blood_pressure` varchar(20) DEFAULT NULL,
  `temperature` decimal(4,2) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donation`
--

INSERT INTO `donation` (`id`, `donor_user_id`, `blood_bank_id`, `donation_promise_id`, `donation_date`, `health_check_notes`, `haemoglobin_level`, `pulse`, `blood_pressure`, `temperature`, `status`, `created_at`) VALUES
(26, 22, 7, 29, '2026-05-24 19:22:30', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-05-24 19:22:30'),
(27, 22, 7, 30, '2026-05-24 19:23:04', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-05-24 19:23:04'),
(28, 22, 7, 31, '2026-05-24 19:23:45', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-05-24 19:23:45'),
(29, 23, 7, 47, '2026-06-10 14:04:41', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-06-10 14:04:41'),
(30, 19, 7, 49, '2026-06-11 17:20:18', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-06-11 17:20:18'),
(31, 28, 7, 50, '2026-06-11 17:22:03', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-06-11 17:22:03'),
(32, 23, 7, 52, '2026-06-11 19:09:31', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-06-11 19:09:31'),
(33, 23, 7, 56, '2026-06-13 13:36:18', NULL, NULL, NULL, NULL, NULL, 'completed', '2026-06-13 13:36:18');

--
-- Triggers `donation`
--
DROP TRIGGER IF EXISTS `trg_donation_after_insert`;
DELIMITER $$
CREATE TRIGGER `trg_donation_after_insert` AFTER INSERT ON `donation` FOR EACH ROW BEGIN
    UPDATE donor_recipient
    SET last_donation_date = CURDATE(),
        total_donations    = total_donations + 1
    WHERE user_id = NEW.donor_user_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `donation_promise`
--

DROP TABLE IF EXISTS `donation_promise`;
CREATE TABLE `donation_promise` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `promise_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `confirmation_code` varchar(50) NOT NULL,
  `qr_code_data` varchar(255) DEFAULT NULL,
  `reminder_sent` tinyint(1) DEFAULT 0,
  `status` varchar(30) DEFAULT 'pending',
  `fulfilled_at` timestamp NULL DEFAULT NULL,
  `broken_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donation_promise`
--

INSERT INTO `donation_promise` (`id`, `donor_user_id`, `blood_bank_id`, `promise_time`, `confirmation_code`, `qr_code_data`, `reminder_sent`, `status`, `fulfilled_at`, `broken_at`) VALUES
(25, 2, 7, '2026-05-27 03:00:00', '9E2F0642CF38', NULL, 0, 'fulfilled', '2026-05-24 12:34:03', NULL),
(26, 22, 7, '2026-05-27 03:00:00', 'F2BC28926C22', NULL, 0, 'fulfilled', '2026-05-24 18:12:32', NULL),
(27, 22, 7, '2026-06-01 03:00:00', '5F43B209CC35', NULL, 0, 'fulfilled', '2026-05-24 15:13:44', NULL),
(28, 22, 7, '2026-05-31 03:00:00', '9EDBEE3F9E44', NULL, 0, 'broken', NULL, '2026-05-24 15:17:49'),
(29, 22, 7, '2026-06-02 03:00:00', 'FCB7E629DCA3', NULL, 0, 'fulfilled', '2026-05-24 15:22:30', NULL),
(30, 22, 7, '2026-06-03 03:00:00', '7D53AB3BE11F', NULL, 0, 'fulfilled', '2026-05-24 15:23:04', NULL),
(31, 22, 7, '2026-05-26 03:00:00', 'DD54530EE7B1', NULL, 0, 'fulfilled', '2026-05-24 15:23:45', NULL),
(32, 22, NULL, '2026-05-24 20:20:19', '3C24E23D1299', NULL, 0, 'fulfilled', '2026-05-24 20:20:19', NULL),
(33, 2, NULL, '2026-05-25 05:28:04', '264B9CF970C5', NULL, 0, 'fulfilled', '2026-05-25 05:28:04', NULL),
(34, 23, NULL, '2026-05-25 06:25:41', '682D4990FC1B', NULL, 0, 'fulfilled', '2026-05-25 06:25:41', NULL),
(35, 2, 7, '2026-05-25 12:27:52', '8AA8D49245BA', NULL, 0, 'fulfilled', '2026-05-25 12:27:52', NULL),
(36, 2, NULL, '2026-06-06 08:43:06', '2BFA67121B52', NULL, 0, 'broken', '2026-06-06 08:43:06', NULL),
(37, 19, NULL, '2026-06-06 09:18:58', '32DD78AA0645', NULL, 0, 'broken', '2026-06-06 09:18:58', NULL),
(38, 19, NULL, '2026-06-06 09:21:25', 'BB29923F5609', NULL, 0, 'broken', '2026-06-06 09:21:25', NULL),
(39, 19, NULL, '2026-06-06 09:29:29', 'CA21F1AE0E82', NULL, 0, 'broken', '2026-06-06 09:29:29', NULL),
(40, 19, NULL, '2026-06-06 12:13:12', '6A9C948E843E', NULL, 0, 'broken', '2026-06-06 12:13:12', NULL),
(41, 2, NULL, '2026-06-06 12:13:37', '53CA09B0001B', NULL, 0, 'fulfilled', '2026-06-06 12:13:37', NULL),
(42, 19, NULL, '2026-06-06 13:53:38', 'C8C573366C31', NULL, 0, 'broken', '2026-06-06 13:53:38', NULL),
(43, 23, NULL, '2026-06-06 14:53:05', '2E931565D25F', NULL, 0, 'fulfilled', '2026-06-06 14:53:05', NULL),
(44, 19, NULL, '2026-06-07 11:17:27', '0C25E08A703C', NULL, 0, 'fulfilled', '2026-06-07 11:17:27', NULL),
(45, 19, NULL, '2026-06-09 10:42:55', 'F0A4FC5BC673', NULL, 0, 'fulfilled', '2026-06-09 10:42:55', NULL),
(46, 26, NULL, '2026-06-10 10:16:50', '65B3AC9B362A', NULL, 0, 'fulfilled', '2026-06-10 10:16:50', NULL),
(47, 23, 7, '2026-06-11 03:00:00', 'B89A53D30EBC', NULL, 0, 'fulfilled', '2026-06-10 10:04:41', NULL),
(48, 23, NULL, '2026-06-11 16:19:51', 'DAB973272E9B', NULL, 0, 'fulfilled', '2026-06-11 16:19:51', NULL),
(49, 19, 7, '2026-06-12 03:00:00', 'E8E552BA3F36', NULL, 0, 'fulfilled', '2026-06-11 13:20:17', NULL),
(50, 28, 7, '2026-06-12 03:00:00', 'B3CBD27C191E', NULL, 0, 'fulfilled', '2026-06-11 13:22:03', NULL),
(51, 19, NULL, '2026-06-11 17:32:53', 'F400BBA0FA22', NULL, 0, 'fulfilled', '2026-06-11 17:32:53', NULL),
(52, 23, 7, '2026-06-13 03:00:00', '4F7840C90DE5', NULL, 0, 'fulfilled', '2026-06-11 15:09:31', NULL),
(53, 19, 7, '2026-06-11 19:14:32', '3454EE700BB9', NULL, 0, 'fulfilled', '2026-06-11 19:14:32', NULL),
(54, 28, 7, '2026-06-13 03:00:00', 'B0B9D8BB3258', NULL, 0, 'cancelled', NULL, NULL),
(55, 28, 7, '2026-06-13 03:00:00', '22EA11167A02', NULL, 0, 'pending', NULL, NULL),
(56, 23, 7, '2026-06-17 03:00:00', 'C626B2DB1CB6', NULL, 0, 'fulfilled', '2026-06-13 09:36:18', NULL),
(57, 19, 7, '2026-06-13 13:42:26', '4F604C40C224', NULL, 0, 'fulfilled', '2026-06-13 13:42:26', NULL);

--
-- Triggers `donation_promise`
--
DROP TRIGGER IF EXISTS `trg_donation_promise_before_insert`;
DELIMITER $$
CREATE TRIGGER `trg_donation_promise_before_insert` BEFORE INSERT ON `donation_promise` FOR EACH ROW BEGIN
    IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
        SET NEW.confirmation_code = fn_generate_code();
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `donor_escort_request`
--

DROP TABLE IF EXISTS `donor_escort_request`;
CREATE TABLE `donor_escort_request` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `pickup_address` text NOT NULL,
  `pickup_lat` decimal(10,8) DEFAULT NULL,
  `pickup_lng` decimal(11,8) DEFAULT NULL,
  `preferred_gender` varchar(10) DEFAULT NULL,
  `preferred_time` timestamp NULL DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `escort_completed_at` timestamp NULL DEFAULT NULL,
  `safety_code` varchar(20) DEFAULT NULL,
  `assigned_delivery_staff_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `donor_health_record`
--

DROP TABLE IF EXISTS `donor_health_record`;
CREATE TABLE `donor_health_record` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `haemoglobin` decimal(4,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `blood_pressure_sys` int(11) DEFAULT NULL,
  `blood_pressure_dia` int(11) DEFAULT NULL,
  `pulse` int(11) DEFAULT NULL,
  `temperature` decimal(4,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `donor_recipient`
--

DROP TABLE IF EXISTS `donor_recipient`;
CREATE TABLE `donor_recipient` (
  `user_id` int(11) NOT NULL,
  `blood_group` varchar(5) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `last_donation_date` date DEFAULT NULL,
  `total_donations` int(11) DEFAULT 0,
  `is_available` tinyint(1) DEFAULT 1,
  `trust_score` int(11) DEFAULT 100,
  `family_legacy_id` int(11) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `underlying_conditions` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donor_recipient`
--

INSERT INTO `donor_recipient` (`user_id`, `blood_group`, `date_of_birth`, `gender`, `weight_kg`, `height_cm`, `last_donation_date`, `total_donations`, `is_available`, `trust_score`, `family_legacy_id`, `emergency_contact`, `underlying_conditions`, `created_at`) VALUES
(2, 'A+', '2014-05-08', 'Male', 55.00, 170.00, '2026-06-06', 4, 1, 90, NULL, '', '', '2026-05-07 22:00:21'),
(3, 'AB+', '2019-01-08', 'Male', 60.00, 165.00, NULL, 0, 1, 100, NULL, '91420539315', 'sicle', '2026-05-07 23:25:33'),
(4, 'O+', '2003-06-09', 'Male', 75.00, 250.00, NULL, 0, 1, 100, NULL, NULL, NULL, '2026-05-08 09:06:42'),
(5, 'O+', '2026-04-02', 'Male', 65.00, 756.00, NULL, 0, 1, 100, NULL, NULL, NULL, '2026-05-08 22:04:02'),
(7, 'O+', '2011-06-07', 'Male', 60.00, 165.00, NULL, 0, 1, 100, NULL, '01235562262', 'Dhur betta', '2026-05-09 10:35:43'),
(10, 'O+', '2003-06-09', 'Male', 83.00, 170.18, '2026-05-21', 1, 1, 100, NULL, '01934163344', 'None', '2026-05-11 11:05:02'),
(14, 'A+', '2013-05-15', 'Male', 55.00, 170.00, NULL, 0, 1, 100, NULL, '01790716105', 'NB', '2026-05-15 05:21:59'),
(19, 'B+', '2003-06-09', 'Male', 85.00, 175.00, '2026-06-13', 6, 1, 85, NULL, '01934163344', 'none', '2026-05-22 08:06:35'),
(21, 'B+', '2008-02-08', 'Male', 85.00, 180.00, NULL, 0, 1, 100, NULL, '01934163344', 'none..', '2026-05-22 11:02:54'),
(22, 'B+', '2009-02-13', 'Male', 51.00, 190.00, '2026-05-25', 14, 1, 100, NULL, '01934163344', 'None', '2026-05-22 11:11:01'),
(23, 'B+', '2003-05-20', 'Male', 55.00, 170.00, '2026-06-13', 6, 1, 35, NULL, '01790716105', 'Chest pain', '2026-05-23 14:13:00'),
(24, 'O+', '2003-06-09', 'Male', 85.00, 190.00, NULL, 0, 1, 100, NULL, '01934163344', 'None', '2026-06-07 10:33:22'),
(26, 'B+', NULL, '', 60.00, 165.00, '2026-06-10', 1, 1, 100, NULL, '', '', '2026-06-10 10:11:21'),
(27, 'B+', '2003-06-01', 'Male', 65.00, 170.00, NULL, 0, 1, 100, NULL, '01934163344', 'None', '2026-06-11 12:34:46'),
(28, 'B+', '2003-01-08', 'Male', 65.00, 170.00, '2026-06-11', 1, 1, 95, NULL, '01934163344', 'None', '2026-06-11 12:36:49');

-- --------------------------------------------------------

--
-- Table structure for table `donor_rewards`
--

DROP TABLE IF EXISTS `donor_rewards`;
CREATE TABLE `donor_rewards` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) NOT NULL,
  `milestone` int(11) NOT NULL COMMENT 'Milestone number (1=10, 2=20, 3=30 donations...)',
  `tier` tinyint(4) NOT NULL COMMENT '0=tshirt, 1=coupon_10, 2=coupon_25',
  `reward_type` varchar(20) NOT NULL,
  `coupon_code` varchar(50) DEFAULT NULL,
  `redeemed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donor_rewards`
--

INSERT INTO `donor_rewards` (`id`, `donor_user_id`, `milestone`, `tier`, `reward_type`, `coupon_code`, `redeemed_at`) VALUES
(1, 19, 1, 0, 'tshirt', NULL, '2026-06-10 11:38:04'),
(2, 19, 2, 1, 'coupon_10', 'BB10-6D6CF475', '2026-06-10 11:38:12'),
(3, 19, 4, 2, 'coupon_25', 'BB25-07E67A87', '2026-06-10 11:38:15'),
(4, 19, 5, 0, 'tshirt', NULL, '2026-06-10 12:04:59'),
(5, 19, 6, 1, 'coupon_10', 'BB10-263523A7', '2026-06-10 12:05:01'),
(6, 19, 8, 2, 'coupon_25', 'BB25-4F495459', '2026-06-10 12:05:06'),
(7, 19, 9, 0, 'tshirt', NULL, '2026-06-10 12:11:52'),
(8, 19, 10, 1, 'coupon_10', 'BB10-5933F57E', '2026-06-10 12:11:58'),
(9, 19, 12, 2, 'coupon_25', 'BB25-0CFF3E91', '2026-06-10 12:12:00'),
(10, 19, 13, 0, 'tshirt', NULL, '2026-06-10 12:12:58'),
(11, 23, 1, 0, 'tshirt', NULL, '2026-06-11 09:20:25'),
(12, 23, 2, 1, 'coupon_10', 'BB10-1E04C8F0', '2026-06-11 09:21:02'),
(13, 23, 4, 2, 'coupon_25', 'BB25-A3E674ED', '2026-06-11 09:21:03'),
(14, 23, 5, 0, 'tshirt', NULL, '2026-06-11 09:21:22'),
(15, 23, 6, 1, 'coupon_10', 'BB10-3AF5567A', '2026-06-11 09:22:25');

-- --------------------------------------------------------

--
-- Table structure for table `drone`
--

DROP TABLE IF EXISTS `drone`;
CREATE TABLE `drone` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `drone_code` varchar(50) DEFAULT NULL,
  `max_weight_kg` decimal(5,2) DEFAULT NULL,
  `battery_level` int(11) DEFAULT 100,
  `status` varchar(30) DEFAULT 'idle',
  `current_latitude` decimal(10,8) DEFAULT NULL,
  `current_longitude` decimal(11,8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `drone`
--

INSERT INTO `drone` (`id`, `blood_bank_id`, `drone_code`, `max_weight_kg`, `battery_level`, `status`, `current_latitude`, `current_longitude`) VALUES
(1, 3, 'DD-020', NULL, 92, 'delivering', NULL, NULL),
(2, 3, 'DRONE-DEMO', NULL, 100, 'delivering', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `drone_dispatch`
--

DROP TABLE IF EXISTS `drone_dispatch`;
CREATE TABLE `drone_dispatch` (
  `id` int(11) NOT NULL,
  `drone_id` int(11) DEFAULT NULL,
  `blood_request_id` int(11) DEFAULT NULL,
  `source_bank_id` int(11) DEFAULT NULL,
  `destination_lat` decimal(10,8) DEFAULT NULL,
  `destination_lng` decimal(11,8) DEFAULT NULL,
  `current_lat` decimal(10,8) DEFAULT NULL,
  `current_lng` decimal(11,8) DEFAULT NULL,
  `speed_kmh` decimal(5,2) DEFAULT 60.00,
  `battery_at_dispatch` int(11) DEFAULT 100,
  `estimated_arrival` timestamp NULL DEFAULT NULL,
  `actual_arrival` timestamp NULL DEFAULT NULL,
  `status` varchar(30) DEFAULT 'scheduled',
  `tracking_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tracking_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `drone_dispatch`
--

INSERT INTO `drone_dispatch` (`id`, `drone_id`, `blood_request_id`, `source_bank_id`, `destination_lat`, `destination_lng`, `current_lat`, `current_lng`, `speed_kmh`, `battery_at_dispatch`, `estimated_arrival`, `actual_arrival`, `status`, `tracking_data`, `created_at`) VALUES
(1, 2, 28, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 100, '2026-05-20 12:50:23', NULL, 'in_transit', NULL, '2026-05-20 16:35:23'),
(2, 1, 32, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-05-21 07:25:31', NULL, 'in_transit', NULL, '2026-05-21 11:10:31'),
(3, 1, 34, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-05-22 04:30:55', NULL, 'in_transit', NULL, '2026-05-22 08:15:55'),
(4, 1, 35, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-05-23 11:53:56', NULL, 'in_transit', NULL, '2026-05-23 15:38:56'),
(5, 1, 40, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-05-23 23:55:02', NULL, 'in_transit', NULL, '2026-05-24 03:40:02'),
(6, 1, 48, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-05-24 14:52:51', '2026-05-26 18:32:43', 'delivered', NULL, '2026-05-24 18:37:51'),
(7, 1, 95, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-06-11 08:54:04', NULL, 'in_transit', NULL, '2026-06-11 12:39:04'),
(8, 1, 67, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-06-11 15:42:30', NULL, 'in_transit', NULL, '2026-06-11 19:27:30'),
(9, 1, 66, 3, 23.81030000, 90.41250000, 23.76420000, 90.38000000, 55.00, 92, '2026-06-11 15:44:03', NULL, 'in_transit', NULL, '2026-06-11 19:29:03');

-- --------------------------------------------------------

--
-- Table structure for table `emergency_broadcast`
--

DROP TABLE IF EXISTS `emergency_broadcast`;
CREATE TABLE `emergency_broadcast` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL DEFAULT 0,
  `sender_type` varchar(50) NOT NULL DEFAULT '',
  `blood_group` varchar(10) NOT NULL DEFAULT '',
  `units_required` int(11) NOT NULL DEFAULT 1,
  `urgency` varchar(20) NOT NULL DEFAULT 'urgent',
  `notes` text DEFAULT NULL,
  `target_roles` varchar(255) DEFAULT '',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `matched_donor_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `emergency_request`
--

DROP TABLE IF EXISTS `emergency_request`;
CREATE TABLE `emergency_request` (
  `id` int(11) NOT NULL,
  `requester_user_id` int(11) NOT NULL,
  `voice_transcript` text NOT NULL,
  `audio_file_url` varchar(500) DEFAULT NULL,
  `extracted_name` varchar(150) DEFAULT NULL,
  `extracted_blood_group` varchar(5) DEFAULT NULL,
  `required_units` int(11) DEFAULT 1,
  `blood_bank_id` int(11) DEFAULT NULL,
  `extracted_location` text DEFAULT NULL,
  `requester_phone` varchar(20) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `processed_by_ai` tinyint(1) DEFAULT 0,
  `ai_confidence_score` decimal(5,4) DEFAULT NULL,
  `matched_donor_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `assigned_to_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `emergency_request`
--

INSERT INTO `emergency_request` (`id`, `requester_user_id`, `voice_transcript`, `audio_file_url`, `extracted_name`, `extracted_blood_group`, `required_units`, `blood_bank_id`, `extracted_location`, `requester_phone`, `status`, `processed_by_ai`, `ai_confidence_score`, `matched_donor_count`, `created_at`, `processed_at`, `completed_at`, `assigned_to_user_id`) VALUES
(2, 10, 'hello my name is Rehan Khan I need urgent a positive love', NULL, 'Rehan Khan I need urgent a positive love', 'O+', 1, NULL, '', '01934163344', 'dismissed', 0, NULL, 5, '2026-05-21 09:34:25', NULL, NULL, NULL),
(3, 2, 'I need urgent O positive blood', NULL, '', 'O+', 1, NULL, '', '01934163344', 'dismissed', 0, NULL, 5, '2026-05-21 09:55:09', NULL, NULL, NULL),
(4, 10, 'hello I need urgent a positive', NULL, '', 'O+', 1, NULL, '', '01934163344', 'dismissed', 0, NULL, 5, '2026-05-21 10:42:49', NULL, NULL, NULL),
(5, 10, 'hello I need urgent blood one unit', NULL, '', 'O+', 1, NULL, '', '01934163344', 'assigned', 0, NULL, 5, '2026-05-21 10:43:30', '2026-05-24 19:16:22', NULL, 7),
(6, 7, '', NULL, 'bank', 'B+', 1, NULL, 'united', '0176735462', 'assigned', 0, NULL, 13, '2026-06-10 14:45:56', '2026-06-13 07:03:44', NULL, 9);

-- --------------------------------------------------------

--
-- Table structure for table `expiry_alert`
--

DROP TABLE IF EXISTS `expiry_alert`;
CREATE TABLE `expiry_alert` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `blood_bag_id` int(11) DEFAULT NULL,
  `days_until_expiry` int(11) NOT NULL,
  `alert_sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `action_taken` varchar(50) DEFAULT NULL,
  `suggested_action` varchar(50) DEFAULT 'alert_sent',
  `discount_percent` decimal(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_legacy`
--

DROP TABLE IF EXISTS `family_legacy`;
CREATE TABLE `family_legacy` (
  `id` int(11) NOT NULL,
  `family_name` varchar(100) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `total_donations` int(11) DEFAULT 0,
  `total_lives_saved` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hospital`
--

DROP TABLE IF EXISTS `hospital`;
CREATE TABLE `hospital` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `registration_no` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hospital`
--

INSERT INTO `hospital` (`id`, `name`, `registration_no`, `email`, `phone`, `address`, `city`, `created_at`) VALUES
(8, 'hospital', 'REG-12365', 'hospital@gmail.com', '97823621354', 'Dhaka', 'Dhaka', '2026-05-15 05:26:53');

-- --------------------------------------------------------

--
-- Table structure for table `international_rotation`
--

DROP TABLE IF EXISTS `international_rotation`;
CREATE TABLE `international_rotation` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `source_blood_bank_id` int(11) DEFAULT NULL,
  `destination_country` varchar(100) DEFAULT NULL,
  `destination_bank_name` varchar(200) DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `units` int(11) DEFAULT NULL,
  `rotation_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(30) DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lab_technician`
--

DROP TABLE IF EXISTS `lab_technician`;
CREATE TABLE `lab_technician` (
  `user_id` int(11) NOT NULL,
  `certification` varchar(100) DEFAULT NULL,
  `lab_name` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lab_technician`
--

INSERT INTO `lab_technician` (`user_id`, `certification`, `lab_name`, `created_at`) VALUES
(8, 'HSC PASS', 'UIU LAB', '2026-05-09 10:46:59'),
(12, 'DLT', 'Popular Diagnostics', '2026-05-13 13:21:55'),
(16, 'BMLT', 'Popular Diagnostics', '2026-05-15 05:23:35');

-- --------------------------------------------------------

--
-- Table structure for table `medical_college`
--

DROP TABLE IF EXISTS `medical_college`;
CREATE TABLE `medical_college` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `registration_no` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medical_college`
--

INSERT INTO `medical_college` (`id`, `name`, `registration_no`, `email`, `phone`, `address`, `city`, `created_at`) VALUES
(5, 'D medica;', 'REG-15663', 'm@gmail.com', '02146262625625', 'hbhdhshcjdhj', 'Dhaka', '2026-05-10 08:52:40'),
(9, 'medical', 'REG-789', 'medical@gmail.com', '01765473655', 'Dhaka', 'Dhaka', '2026-05-15 05:28:46');

-- --------------------------------------------------------

--
-- Table structure for table `mental_health_flag`
--

DROP TABLE IF EXISTS `mental_health_flag`;
CREATE TABLE `mental_health_flag` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `chat_log_id` int(11) DEFAULT NULL,
  `flag_type` varchar(50) NOT NULL,
  `severity` enum('low','medium','high') DEFAULT 'low',
  `keywords_found` text DEFAULT NULL,
  `psychologist_referred` tinyint(1) DEFAULT 0,
  `resolved` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
CREATE TABLE `notification` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `channel` enum('in_app','sms','email','push') DEFAULT 'in_app',
  `delivered` tinyint(1) DEFAULT 0,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`id`, `user_id`, `title`, `message`, `channel`, `delivered`, `delivered_at`, `is_read`, `created_at`) VALUES
(1, 1, 'Admin Warning: Trust Score', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 00:31:42'),
(2, 1, 'Admin Warning: Trust Score', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 01:03:47'),
(3, 1, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 01:39:27'),
(4, 1, 'Admin Warning: Trust Score', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 01:59:45'),
(5, 1, 'Admin Warning: Trust Score', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 02:01:16'),
(6, 1, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 06:57:40'),
(7, 1, 'Admin Warning', 'Your BloodBridge trust score is below 50 (30). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-16 11:09:04'),
(8, 1, 'Admin Warning', 'Your BloodBridge trust score is below 50 (35). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-19 07:06:29'),
(9, 1, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-20 16:40:33'),
(10, 1, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0030. Confirmation code: F9DB2BDD279C', 'in_app', 0, NULL, 1, '2026-05-21 07:54:41'),
(11, 1, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0031. Confirmation code: E7E43BDA41D8', 'in_app', 0, NULL, 1, '2026-05-21 08:14:57'),
(12, 1, 'Blood Request Approved', 'Your blood request #REQ-0002 for O+ has been approved by the blood bank.', 'in_app', 0, NULL, 1, '2026-05-21 08:51:39'),
(13, 10, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0033. Confirmation code: 13390DA08333', 'in_app', 0, NULL, 1, '2026-05-21 16:59:00'),
(14, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(15, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(16, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(17, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(18, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(19, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:33'),
(20, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:34'),
(21, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:34'),
(22, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 13:17:34'),
(23, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:34'),
(24, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:17:34'),
(25, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:13'),
(26, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:13'),
(27, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:13'),
(28, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:13'),
(29, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:15'),
(30, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:15'),
(31, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:15'),
(32, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:15'),
(33, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 13:43:15'),
(34, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:16'),
(35, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:43:16'),
(36, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:49'),
(37, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:49'),
(38, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:49'),
(39, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:49'),
(40, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:50'),
(41, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:50'),
(42, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:50'),
(43, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:50'),
(44, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 13:52:50'),
(45, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:51'),
(46, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 13:52:51'),
(47, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:18'),
(48, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:18'),
(49, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:18'),
(50, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:18'),
(51, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:19'),
(52, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:19'),
(53, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:19'),
(54, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:19'),
(55, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 14:00:19'),
(56, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:20'),
(57, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:00:20'),
(58, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:51'),
(59, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:51'),
(60, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:51'),
(61, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:51'),
(62, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:53'),
(63, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:53'),
(64, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:53'),
(65, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:53'),
(66, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 14:36:53'),
(67, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:54'),
(68, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:36:54'),
(69, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:17'),
(70, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:17'),
(71, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:17'),
(72, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:17'),
(73, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:18'),
(74, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:19'),
(75, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:19'),
(76, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:19'),
(77, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 14:46:19'),
(78, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:20'),
(79, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:46:20'),
(80, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:09'),
(81, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:09'),
(82, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:09'),
(83, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:09'),
(84, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:10'),
(85, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:10'),
(86, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:10'),
(87, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:10'),
(88, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 14:51:10'),
(89, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:12'),
(90, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:51:12'),
(91, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:19'),
(92, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:19'),
(93, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:19'),
(94, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:19'),
(95, 2, '💔 Partner Unlinked', 'Kanik Deb has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:20'),
(96, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:20'),
(97, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:20'),
(98, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:20'),
(99, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 14:53:20'),
(100, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:21'),
(101, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 14:53:21'),
(102, 1, '💔 Partner Unlinked', 'anik has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 15:19:46'),
(103, 1, '💍 Partner Request', 'anik has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 15:23:00'),
(104, 1, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:24:26'),
(105, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:24:26'),
(106, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 15:24:26'),
(107, 1, '💔 Partner Unlinked', 'anik has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 15:24:47'),
(108, 2, '💍 Partner Request', 'Kanik Deb has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 15:26:24'),
(109, 1, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 15:26:51'),
(110, 1, '💔 Partner Unlinked', 'anik has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 15:27:43'),
(111, 2, '💍 Partner Request', 'Rayhan Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-22 15:40:11'),
(112, 10, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-22 15:40:37'),
(113, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:11'),
(114, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:11'),
(115, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:37'),
(116, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:37'),
(117, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:37'),
(118, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:51:37'),
(119, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:52:49'),
(120, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:52:49'),
(121, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:52:50'),
(122, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:52:50'),
(123, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:53:41'),
(124, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:53:41'),
(125, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:53:42'),
(126, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 15:53:42'),
(127, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 16:04:37'),
(128, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-22 16:04:37'),
(129, 2, '💔 Partner Unlinked', 'Rayhan Khan has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-22 16:05:01'),
(130, 3, '💍 Partner Request', 'Rayhan Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-23 12:27:54'),
(131, 2, '💍 Partner Request', 'Rayhan Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-23 12:47:15'),
(132, 10, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-23 12:47:46'),
(133, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 12:56:10'),
(134, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 12:56:10'),
(135, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 12:56:11'),
(136, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 12:56:11'),
(137, 10, '💔 Partner Unlinked', 'anik has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-23 12:56:47'),
(138, 10, '💍 Partner Request', 'anik has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-23 12:58:59'),
(139, 2, '✅ Partner Linked', 'Rayhan Khan has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-23 12:59:33'),
(140, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 13:09:30'),
(141, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 13:09:30'),
(142, 2, '💔 Partner Unlinked', 'Rayhan Khan has unlinked from you.', 'in_app', 0, NULL, 1, '2026-05-23 13:15:51'),
(143, 2, '💍 Partner Request', 'Rayhan Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 1, '2026-05-23 13:16:03'),
(144, 10, '✅ Partner Linked', 'anik has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 1, '2026-05-23 13:16:25'),
(145, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-23 14:46:08'),
(146, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-23 15:01:23'),
(147, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-23 15:20:21'),
(148, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-23 16:27:08'),
(149, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-23 16:59:22'),
(150, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:00'),
(151, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:00'),
(152, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:00'),
(153, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:00'),
(154, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:31'),
(155, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:04:31'),
(156, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:05:15'),
(157, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:05:15'),
(158, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:08:08'),
(159, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-23 17:08:08'),
(160, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-24 03:12:29'),
(161, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-24 03:23:01'),
(162, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 03:30:06'),
(163, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 03:30:06'),
(164, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 03:36:36'),
(165, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 03:36:36'),
(166, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 05:59:12'),
(167, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 05:59:12'),
(168, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 06:05:07'),
(169, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 06:05:07'),
(170, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:49:31'),
(171, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:49:31'),
(172, 23, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0038. Confirmation code: 6295055F2CE9', 'in_app', 0, NULL, 1, '2026-05-24 07:49:47'),
(173, 23, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0039. Confirmation code: 0917DC7677D4', 'in_app', 0, NULL, 1, '2026-05-24 07:49:58'),
(174, 23, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0036. Confirmation code: E734E62364A3', 'in_app', 0, NULL, 1, '2026-05-24 07:50:11'),
(175, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:56:09'),
(176, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:56:09'),
(177, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:56:27'),
(178, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:56:27'),
(179, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:58:12'),
(180, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 07:58:12'),
(181, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:02:37'),
(182, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:02:37'),
(183, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:03:04'),
(184, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:03:04'),
(185, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:04:57'),
(186, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:04:57'),
(187, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:54:40'),
(188, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:54:40'),
(189, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:55:11'),
(190, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:55:11'),
(191, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:57:37'),
(192, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 08:57:38'),
(193, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:20:39'),
(194, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:20:39'),
(195, 23, 'Blood Request Accepted 🩸', 'A donor has accepted your blood request #REQ-0037. Confirmation code: EA17AEAEFCE3', 'in_app', 0, NULL, 1, '2026-05-24 09:20:47'),
(196, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:20:55'),
(197, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:20:55'),
(198, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:22:00'),
(199, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:22:00'),
(200, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:23:49'),
(201, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:23:49'),
(202, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:27:37'),
(203, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:27:37'),
(204, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:27:40'),
(205, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 09:27:40'),
(206, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:38:34'),
(207, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:38:34'),
(208, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:38:48'),
(209, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:38:48'),
(210, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:42:18'),
(211, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:42:18'),
(212, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:46:04'),
(213, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:46:04'),
(214, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:48:55'),
(215, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:48:55'),
(216, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:51:27'),
(217, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:51:27'),
(218, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:59:28'),
(219, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 12:59:28'),
(220, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0045. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 12:59:43'),
(221, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0045. Barcode: BB20260524153733913', 'in_app', 0, NULL, 1, '2026-05-24 13:37:33'),
(222, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 13:37:33'),
(223, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0045 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 13:56:24'),
(224, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:03:40'),
(225, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:03:40'),
(226, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:51:39'),
(227, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:51:39'),
(228, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:53:13'),
(229, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 14:53:13'),
(230, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0046. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 14:53:22'),
(231, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (40). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 1, '2026-05-24 15:21:04'),
(232, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 15:27:01'),
(233, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 15:27:01'),
(234, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 15:33:21'),
(235, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 15:33:21'),
(236, 2, 'Donation Promise Saved', 'Your donation promise has been scheduled. Confirmation code: 9E2F0642CF38. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 15:34:29'),
(237, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:02:59'),
(238, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:02:59'),
(239, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: F2BC28926C22. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 18:06:01'),
(240, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:07:29'),
(241, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:07:29'),
(242, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:08:17'),
(243, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:08:17'),
(244, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0047. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 18:08:45'),
(245, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0047. Barcode: BB20260524200955656', 'in_app', 0, NULL, 1, '2026-05-24 18:09:55'),
(246, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 18:09:55');
INSERT INTO `notification` (`id`, `user_id`, `title`, `message`, `channel`, `delivered`, `delivered_at`, `is_read`, `created_at`) VALUES
(247, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:12:08'),
(248, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:12:08'),
(249, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:31:14'),
(250, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 18:31:14'),
(251, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:11:38'),
(252, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:11:38'),
(253, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:11:41'),
(254, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:11:41'),
(255, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: 5F43B209CC35. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:13:08'),
(256, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:13:17'),
(257, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:13:17'),
(258, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: 9EDBEE3F9E44. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:17:30'),
(259, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: FCB7E629DCA3. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:18:21'),
(260, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: 7D53AB3BE11F. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:22:21'),
(261, 22, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: DD54530EE7B1. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:23:24'),
(262, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:29:23'),
(263, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:29:23'),
(264, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:32:05'),
(265, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:32:05'),
(266, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:33:05'),
(267, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:33:05'),
(268, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:33:46'),
(269, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:33:46'),
(270, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0050. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 19:34:14'),
(271, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0050. Barcode: BB20260524213454473', 'in_app', 0, NULL, 1, '2026-05-24 19:34:54'),
(272, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:34:54'),
(273, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0050 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 19:35:28'),
(274, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:47:00'),
(275, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:47:00'),
(276, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:47:25'),
(277, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:47:25'),
(278, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0051. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 19:47:47'),
(279, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0051. Barcode: BB20260524214814965', 'in_app', 0, NULL, 1, '2026-05-24 19:48:15'),
(280, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:48:15'),
(281, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0051 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 19:48:30'),
(282, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:56:13'),
(283, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:56:13'),
(284, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:57:18'),
(285, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:57:18'),
(286, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0052. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 19:57:36'),
(287, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0052. Barcode: BB20260524215802893', 'in_app', 0, NULL, 1, '2026-05-24 19:58:02'),
(288, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 19:58:02'),
(289, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0052 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 19:58:13'),
(290, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:59:35'),
(291, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 19:59:35'),
(292, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:00:35'),
(293, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:00:35'),
(294, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0053. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 20:05:29'),
(295, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:06:03'),
(296, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:06:03'),
(297, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0053. Barcode: BB20260524220612958', 'in_app', 0, NULL, 1, '2026-05-24 20:06:12'),
(298, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 20:06:12'),
(299, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0053 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 20:06:27'),
(300, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0049. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 20:13:53'),
(301, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:18:27'),
(302, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:18:27'),
(303, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:19:19'),
(304, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:19:19'),
(305, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0054. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-24 20:19:35'),
(306, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0054. Barcode: BB20260524222005401', 'in_app', 0, NULL, 1, '2026-05-24 20:20:05'),
(307, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 20:20:05'),
(308, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0049. Barcode: BB20260524222009255', 'in_app', 0, NULL, 1, '2026-05-24 20:20:09'),
(309, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-24 20:20:09'),
(310, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0054 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-24 20:20:19'),
(311, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:29:17'),
(312, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:29:17'),
(313, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:35:50'),
(314, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:35:50'),
(315, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:38:50'),
(316, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:38:50'),
(317, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:40:24'),
(318, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:40:24'),
(319, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:29'),
(320, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:29'),
(321, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:33'),
(322, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:33'),
(323, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:34'),
(324, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:34'),
(325, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:55'),
(326, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:43:55'),
(327, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:44:11'),
(328, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:44:11'),
(329, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:47:02'),
(330, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:47:02'),
(331, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:47:30'),
(332, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:47:30'),
(333, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:48:12'),
(334, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:48:12'),
(335, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:49:05'),
(336, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:49:05'),
(337, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:52:30'),
(338, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:52:30'),
(339, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:54:36'),
(340, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-24 20:54:36'),
(341, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 05:17:23'),
(342, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 05:17:23'),
(343, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0055. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 05:19:06'),
(344, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0055. Barcode: BB20260525072704672', 'in_app', 0, NULL, 1, '2026-05-25 05:27:04'),
(345, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 05:27:04'),
(346, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0055 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 05:28:04'),
(347, 2, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0056. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 05:32:03'),
(348, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0056. Barcode: BB20260525082521226', 'in_app', 0, NULL, 1, '2026-05-25 06:25:22'),
(349, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 06:25:22'),
(350, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0056 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 06:25:41'),
(351, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0056 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 06:25:52'),
(352, 2, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0057. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 06:27:30'),
(353, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0057. Barcode: BB20260525082800647', 'in_app', 0, NULL, 1, '2026-05-25 06:28:00'),
(354, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 06:28:00'),
(355, 2, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0058. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 06:29:55'),
(356, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0058. Barcode: BB20260525083020680', 'in_app', 0, NULL, 1, '2026-05-25 06:30:20'),
(357, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 06:30:20'),
(358, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0058 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 06:30:33'),
(359, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0058. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 06:56:36'),
(360, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0058. Barcode: BB20260525085718145', 'in_app', 0, NULL, 1, '2026-05-25 06:57:18'),
(361, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 06:57:18'),
(362, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0058 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 06:57:43'),
(363, 23, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0058. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-05-25 06:57:43'),
(364, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0057. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 06:59:32'),
(365, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0057. Barcode: BB20260525090000724', 'in_app', 0, NULL, 1, '2026-05-25 07:00:00'),
(366, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 07:00:00'),
(367, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0057 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 07:00:42'),
(368, 23, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0057. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-05-25 07:00:42'),
(369, 2, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0059. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 07:08:50'),
(370, 2, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0059. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 07:09:15'),
(371, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0059. Barcode: BB20260525090940512', 'in_app', 0, NULL, 1, '2026-05-25 07:09:40'),
(372, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 07:09:40'),
(373, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0059. Barcode: BB20260525090943378', 'in_app', 0, NULL, 1, '2026-05-25 07:09:43'),
(374, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 07:09:43'),
(375, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0059 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 07:09:52'),
(376, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0059 was accepted by anik. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 07:09:58'),
(377, 23, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0059. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-05-25 07:09:58'),
(378, 2, 'Blood Request Approved', 'Your blood request #REQ-0060 for O+ has been approved by the blood bank.', 'in_app', 0, NULL, 1, '2026-05-25 09:40:17'),
(379, 2, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0062 for O+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 10:09:00'),
(380, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:15:23'),
(381, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:15:23'),
(382, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:27:19'),
(383, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:27:19'),
(384, 7, '🎯 Your Offer Was Selected', 'The requester has selected your blood offer for request #REQ-0062. Please prepare 1 unit(s) of blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 10:28:03'),
(385, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:39:11'),
(386, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:39:11'),
(387, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:40:04'),
(388, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:40:04'),
(389, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:45:03'),
(390, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:45:03'),
(391, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:45:36'),
(392, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:45:36'),
(393, 2, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0066 for O+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 10:45:58'),
(394, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0066. Please prepare 2 unit(s) of O+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 10:46:11'),
(395, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:55:03'),
(396, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-05-25 10:55:03'),
(397, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0067. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:08:09'),
(398, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0067. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:08:56'),
(399, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0067. Barcode: BB20260525130924298', 'in_app', 0, NULL, 1, '2026-05-25 11:09:24'),
(400, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:09:24'),
(401, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0067. Barcode: BB20260525130927227', 'in_app', 0, NULL, 1, '2026-05-25 11:09:27'),
(402, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:09:27'),
(403, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0067 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:09:37'),
(404, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0067 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:09:55'),
(405, 22, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0067. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-05-25 11:09:55'),
(406, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0068. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:11:55'),
(407, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0068. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:12:12'),
(408, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0068. Barcode: BB20260525131259129', 'in_app', 0, NULL, 1, '2026-05-25 11:12:59'),
(409, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:12:59'),
(410, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0068. Barcode: BB20260525131302405', 'in_app', 0, NULL, 1, '2026-05-25 11:13:02'),
(411, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:13:02'),
(412, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0068 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:14:16'),
(413, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0068 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:29:04'),
(414, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0069. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:30:05'),
(415, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0069. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:30:35'),
(416, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0069. Barcode: BB20260525133045466', 'in_app', 0, NULL, 1, '2026-05-25 11:30:45'),
(417, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:30:45'),
(418, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0069. Barcode: BB20260525133048471', 'in_app', 0, NULL, 1, '2026-05-25 11:30:48'),
(419, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:30:48'),
(420, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0069 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:31:06'),
(421, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0069 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:36:43'),
(422, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0070. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:37:28'),
(423, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0070. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 11:37:59'),
(424, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0070. Barcode: BB20260525133807565', 'in_app', 0, NULL, 1, '2026-05-25 11:38:07'),
(425, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:38:07'),
(426, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0070. Barcode: BB20260525133810471', 'in_app', 0, NULL, 1, '2026-05-25 11:38:10'),
(427, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 11:38:10'),
(428, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0070 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:38:21'),
(429, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0070 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 11:38:30'),
(430, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0073 for O+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 11:43:40'),
(431, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0073. Please prepare 2 unit(s) of O+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 11:44:22'),
(432, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0074. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 12:21:24'),
(433, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0074. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 12:22:02'),
(434, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0074. Barcode: BB20260525142228593', 'in_app', 0, NULL, 1, '2026-05-25 12:22:28'),
(435, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 12:22:28'),
(436, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0074. Barcode: BB20260525142232716', 'in_app', 0, NULL, 1, '2026-05-25 12:22:32'),
(437, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 12:22:32'),
(438, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0074 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 12:22:40'),
(439, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0074 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 12:22:47'),
(440, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0075 for O+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 12:25:04'),
(441, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0075. Please prepare 1 unit(s) of O+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 12:25:16'),
(442, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0076. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 12:27:00'),
(443, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0076 for B+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 12:27:11'),
(444, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0076. Barcode: BB20260525142739813', 'in_app', 0, NULL, 1, '2026-05-25 12:27:39'),
(445, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 12:27:39'),
(446, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0076 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 12:27:52'),
(447, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0076. Please prepare 1 unit(s) of B+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 12:28:00'),
(448, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0077. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 16:37:34'),
(449, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0077. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 16:38:31'),
(450, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0077. Barcode: BB20260525183918260', 'in_app', 0, NULL, 1, '2026-05-25 16:39:19'),
(451, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 16:39:19'),
(452, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0077. Barcode: BB20260525183959156', 'in_app', 0, NULL, 1, '2026-05-25 16:39:59'),
(453, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 16:39:59'),
(454, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0077 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 16:40:45'),
(455, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0077 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 16:41:01'),
(456, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0078 for B+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 16:43:47'),
(457, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0078. Please prepare 1 unit(s) of B+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 16:44:26'),
(458, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0079 for B+. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-05-25 16:45:56'),
(459, 23, 'Donor Offer Received', 'rakib has offered to donate for your request #REQ-0079. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 16:46:31'),
(460, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0079. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-05-25 16:47:04'),
(461, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0079. Barcode: BB20260525184721575', 'in_app', 0, NULL, 1, '2026-05-25 16:47:21'),
(462, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 16:47:21'),
(463, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0079. Barcode: BB20260525184802390', 'in_app', 0, NULL, 1, '2026-05-25 16:48:02'),
(464, 22, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-05-25 16:48:02'),
(465, 22, 'Blood Accepted', 'Your blood donation for request #REQ-0079 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-05-25 16:48:55'),
(466, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0079. Please prepare 1 unit(s) of B+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-05-25 16:49:17'),
(467, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 09:54:33'),
(468, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 09:54:33'),
(469, 2, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0080. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-03 09:57:50'),
(470, 2, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0080. Barcode: BB20260603115932718', 'in_app', 0, NULL, 1, '2026-06-03 09:59:32'),
(471, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-03 09:59:32'),
(472, 2, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0080 for B+. This is a free supply offer. Open your request timeline to review and accept.', 'in_app', 0, NULL, 1, '2026-06-03 10:01:10'),
(473, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0080. Please prepare 1 unit(s) of B+ blood for pickup/delivery.', 'in_app', 0, NULL, 1, '2026-06-03 10:02:00'),
(474, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:07:54'),
(475, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:07:54'),
(476, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:08:37'),
(477, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:08:37'),
(478, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:32:50'),
(479, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-03 10:32:50'),
(480, 22, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0082. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-03 15:42:25'),
(481, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0083. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 08:40:03'),
(482, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0083. Barcode: BB20260606104109164', 'in_app', 0, NULL, 1, '2026-06-06 08:41:09'),
(483, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 08:41:09'),
(484, 22, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0082. Barcode: BB20260606104210146', 'in_app', 0, NULL, 1, '2026-06-06 08:42:10'),
(485, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 08:42:10'),
(486, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0083 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 08:43:06'),
(487, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0084. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 09:15:45'),
(488, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0084. Barcode: BB20260606111614780', 'in_app', 0, NULL, 1, '2026-06-06 09:16:14'),
(489, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 09:16:14'),
(490, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0084. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 09:17:57'),
(491, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0084. Barcode: BB20260606111816233', 'in_app', 0, NULL, 1, '2026-06-06 09:18:16'),
(492, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 09:18:16'),
(493, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 09:18:58'),
(494, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 09:18:58'),
(495, 19, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0084. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 09:20:03'),
(496, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 09:21:25'),
(497, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 09:21:25'),
(498, 19, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0084. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 09:21:29'),
(499, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 09:29:29'),
(500, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 09:29:29'),
(501, 19, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0084. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 09:29:33'),
(502, 2, 'Request Reopened', 'The request #REQ-0084 has been reopened. Your previously offered blood bag is now available for acceptance again.', 'in_app', 0, NULL, 1, '2026-06-06 09:29:33'),
(503, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 09:45:52'),
(504, 19, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 09:45:52'),
(505, 2, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0084. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 09:46:14'),
(506, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0084. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 12:11:33'),
(507, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0084. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 12:12:02'),
(508, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0084. Barcode: BB20260606141233134', 'in_app', 0, NULL, 1, '2026-06-06 12:12:33'),
(509, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 12:12:33');
INSERT INTO `notification` (`id`, `user_id`, `title`, `message`, `channel`, `delivered`, `delivered_at`, `is_read`, `created_at`) VALUES
(510, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0084. Barcode: BB20260606141241843', 'in_app', 0, NULL, 1, '2026-06-06 12:12:41'),
(511, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 12:12:41'),
(512, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 12:13:12'),
(513, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 12:13:12'),
(514, 19, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0084. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 12:13:28'),
(515, 2, 'Request Reopened', 'The request #REQ-0084 has been reopened. Your previously offered blood bag is now available for acceptance again.', 'in_app', 0, NULL, 1, '2026-06-06 12:13:28'),
(516, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0084 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 12:13:37'),
(517, 19, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0084. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 12:13:37'),
(518, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0085. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 13:52:18'),
(519, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0085. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 13:52:37'),
(520, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0085. Barcode: BB20260606155300139', 'in_app', 0, NULL, 1, '2026-06-06 13:53:00'),
(521, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 13:53:00'),
(522, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0085. Barcode: BB20260606155303882', 'in_app', 0, NULL, 1, '2026-06-06 13:53:03'),
(523, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 13:53:03'),
(524, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0085 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 13:53:38'),
(525, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0085. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 13:53:38'),
(526, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0086. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 14:10:45'),
(527, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0086. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 14:11:08'),
(528, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0086. Barcode: BB20260606161144502', 'in_app', 0, NULL, 1, '2026-06-06 14:11:44'),
(529, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 14:11:44'),
(530, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0086. Barcode: BB20260606161147635', 'in_app', 0, NULL, 1, '2026-06-06 14:11:47'),
(531, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 14:11:47'),
(532, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0086 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 14:12:12'),
(533, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0086. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 14:12:12'),
(534, 22, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0082. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 14:52:07'),
(535, 22, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0082. Barcode: BB20260606165235285', 'in_app', 0, NULL, 1, '2026-06-06 14:52:35'),
(536, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 14:52:35'),
(537, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0082 was accepted by rakib. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 14:53:05'),
(538, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0082. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 14:53:05'),
(539, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0088. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 15:19:19'),
(540, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0088. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 15:20:00'),
(541, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0088. Barcode: BB20260606172021110', 'in_app', 0, NULL, 1, '2026-06-06 15:20:21'),
(542, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 15:20:21'),
(543, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0088. Barcode: BB20260606172024443', 'in_app', 0, NULL, 1, '2026-06-06 15:20:24'),
(544, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 15:20:24'),
(545, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0088 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 15:20:55'),
(546, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0088. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 15:20:55'),
(547, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0088 via SSL Commerz.', 'in_app', 0, NULL, 1, '2026-06-06 15:27:32'),
(548, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0089. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 17:09:25'),
(549, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-06 17:09:38'),
(550, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-06 17:09:38'),
(551, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0089. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-06 17:09:48'),
(552, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0089. Barcode: BB20260606191019980', 'in_app', 0, NULL, 1, '2026-06-06 17:10:19'),
(553, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 17:10:19'),
(554, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0089. Barcode: BB20260606191022689', 'in_app', 0, NULL, 1, '2026-06-06 17:10:22'),
(555, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-06 17:10:22'),
(556, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0089 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 17:10:53'),
(557, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0089. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 17:10:53'),
(558, 19, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-0089. Your donation record has been reverted.', 'in_app', 0, NULL, 1, '2026-06-06 17:12:22'),
(559, 2, 'Request Reopened', 'The request #REQ-0089 has been reopened. Your previously offered blood bag is now available for acceptance again.', 'in_app', 0, NULL, 1, '2026-06-06 17:12:22'),
(560, 2, 'Blood Accepted', 'Your blood donation for request #REQ-0089 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-06 17:12:57'),
(561, 19, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0089. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-06 17:12:57'),
(562, 2, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0089 via SSL Commerz.', 'in_app', 0, NULL, 1, '2026-06-06 17:13:50'),
(563, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0090. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-07 11:15:34'),
(564, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-07 11:15:53'),
(565, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 1, '2026-06-07 11:15:53'),
(566, 23, 'Donor Offer Received', 'anik has offered to donate for your request #REQ-0090. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 1, '2026-06-07 11:16:03'),
(567, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0090. Barcode: BB20260607131637182', 'in_app', 0, NULL, 1, '2026-06-07 11:16:37'),
(568, 2, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-07 11:16:37'),
(569, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0090. Barcode: BB20260607131644453', 'in_app', 0, NULL, 1, '2026-06-07 11:16:44'),
(570, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 1, '2026-06-07 11:16:44'),
(571, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0090 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 1, '2026-06-07 11:17:27'),
(572, 2, 'Offer Not Selected', 'Thank you for offering to donate for request #REQ-0090. The requester has fulfilled all units needed. Your generosity is appreciated!', 'in_app', 0, NULL, 1, '2026-06-07 11:17:27'),
(573, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0090 via SSL Commerz.', 'in_app', 0, NULL, 1, '2026-06-07 11:18:31'),
(574, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0091. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-09 10:24:30'),
(575, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0091. Barcode: BB20260609123152719', 'in_app', 0, NULL, 0, '2026-06-09 10:31:52'),
(576, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-09 10:31:52'),
(577, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0092. They are asking ৳2,000 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-09 10:39:24'),
(578, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0092. Barcode: BB20260609123942778', 'in_app', 0, NULL, 0, '2026-06-09 10:39:42'),
(579, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-09 10:39:42'),
(580, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0092 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-09 10:42:55'),
(581, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0092 via SSL Commerz.', 'in_app', 0, NULL, 0, '2026-06-09 10:43:14'),
(582, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0093. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-09 10:52:47'),
(583, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0093. Barcode: BB20260609125258813', 'in_app', 0, NULL, 0, '2026-06-09 10:52:58'),
(584, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-09 10:52:58'),
(585, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0093 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-09 10:53:29'),
(586, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0093 via SSL Commerz.', 'in_app', 0, NULL, 0, '2026-06-09 10:53:43'),
(587, 19, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0094. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-10 10:15:27'),
(588, 19, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0094. Barcode: BB20260610121632296', 'in_app', 0, NULL, 0, '2026-06-10 10:16:32'),
(589, 26, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-10 10:16:32'),
(590, 26, 'Blood Accepted', 'Your blood donation for request #REQ-0094 was accepted by R Khan. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-10 10:16:50'),
(591, 26, 'Donation Completed', 'The requester has confirmed your donation for request #REQ-0094 as complete. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-10 10:16:54'),
(592, 23, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: B89A53D30EBC. Thank you!', 'in_app', 0, NULL, 0, '2026-06-10 14:03:05'),
(593, 19, '🚨 Emergency Blood Request', '🚨 bank needs B+ blood urgently. Please respond if you can donate.', 'in_app', 0, NULL, 0, '2026-06-10 14:45:56'),
(594, 21, '🚨 Emergency Blood Request', '🚨 bank needs B+ blood urgently. Please respond if you can donate.', 'in_app', 0, NULL, 0, '2026-06-10 14:45:56'),
(595, 22, '🚨 Emergency Blood Request', '🚨 bank needs B+ blood urgently. Please respond if you can donate.', 'in_app', 0, NULL, 0, '2026-06-10 14:45:56'),
(596, 23, '🚨 Emergency Blood Request', '🚨 bank needs B+ blood urgently. Please respond if you can donate.', 'in_app', 0, NULL, 0, '2026-06-10 14:45:56'),
(597, 26, '🚨 Emergency Blood Request', '🚨 bank needs B+ blood urgently. Please respond if you can donate.', 'in_app', 0, NULL, 0, '2026-06-10 14:45:56'),
(598, 7, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0006. This is a free donation offer. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-10 14:46:46'),
(599, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 13:23:18'),
(600, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 13:26:46'),
(601, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 14:07:01'),
(602, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 14:56:05'),
(603, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:03:28'),
(604, 10, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:03:28'),
(605, 10, '💔 Partner Unlinked', 'anik has unlinked from you.', 'in_app', 0, NULL, 0, '2026-06-11 15:03:52'),
(606, 19, '💍 Partner Request', 'anika has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 0, '2026-06-11 15:07:41'),
(607, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:43'),
(608, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:43'),
(609, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:43'),
(610, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:43'),
(611, 2, '✅ Partner Linked', 'R Khan has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 0, '2026-06-11 15:43:43'),
(612, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:48'),
(613, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:43:48'),
(614, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:47:23'),
(615, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 15:47:23'),
(616, 2, '💔 Partner Unlinked', 'R Khan has unlinked from you.', 'in_app', 0, NULL, 0, '2026-06-11 15:47:33'),
(617, 19, '💍 Partner Request', 'anika has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 0, '2026-06-11 15:48:40'),
(618, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:00'),
(619, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:00'),
(620, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:00'),
(621, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:00'),
(622, 2, '✅ Partner Linked', 'R Khan has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 0, '2026-06-11 16:00:00'),
(623, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:07'),
(624, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:00:07'),
(625, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:03:21'),
(626, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:03:21'),
(627, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:05:42'),
(628, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:05:42'),
(629, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:09:23'),
(630, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:09:23'),
(631, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:16:16'),
(632, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:16:16'),
(633, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:17:38'),
(634, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:17:38'),
(635, 19, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0097. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-11 16:18:08'),
(636, 19, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0097. Barcode: BB20260611181855128', 'in_app', 0, NULL, 0, '2026-06-11 16:18:55'),
(637, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 16:18:55'),
(638, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:19:42'),
(639, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:19:42'),
(640, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0097 was accepted by R Khan. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-11 16:19:51'),
(641, 23, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0097 via SSL Commerz.', 'in_app', 0, NULL, 0, '2026-06-11 16:21:32'),
(642, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:23:10'),
(643, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 16:23:10'),
(644, 2, '💔 Partner Unlinked', 'R Khan has unlinked from you.', 'in_app', 0, NULL, 0, '2026-06-11 16:23:29'),
(645, 19, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: E8E552BA3F36. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 16:28:38'),
(646, 19, 'Donor Offer Received', 'Kanik Deb has offered to donate for your request #REQ-0098. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-11 16:43:03'),
(647, 19, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0098. Barcode: BB20260611184348294', 'in_app', 0, NULL, 0, '2026-06-11 16:43:48'),
(648, 23, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 16:43:48'),
(649, 23, 'Blood Accepted', 'Your blood donation for request #REQ-0098 was accepted by R Khan. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-11 16:44:06'),
(650, 28, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: B3CBD27C191E. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 17:18:22'),
(651, 28, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0099. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-11 17:30:52'),
(652, 28, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0099. Barcode: BB20260611193154749', 'in_app', 0, NULL, 0, '2026-06-11 17:31:54'),
(653, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 17:31:54'),
(654, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0099 was accepted by Digonto Shaha. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-11 17:32:53'),
(655, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0099 via SSL Commerz.', 'in_app', 0, NULL, 0, '2026-06-11 17:33:26'),
(656, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 19:06:27'),
(657, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (45). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-11 19:08:08'),
(658, 23, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: 4F7840C90DE5. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 19:08:47'),
(659, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0100 for B+. This is a free supply offer. Open your request timeline to review and accept.', 'in_app', 0, NULL, 0, '2026-06-11 19:11:00'),
(660, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0100. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-11 19:13:34'),
(661, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0100. Barcode: BB20260611211409143', 'in_app', 0, NULL, 0, '2026-06-11 19:14:09'),
(662, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-11 19:14:09'),
(663, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0100 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-11 19:14:32'),
(664, 7, '🎯 Your Offer Was Selected', 'The requester has selected your offer for request #REQ-0100. Please prepare 1 unit(s) of B+ blood for pickup/delivery.', 'in_app', 0, NULL, 0, '2026-06-11 19:14:38'),
(665, 19, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-0100 via SSL Commerz.', 'in_app', 0, NULL, 0, '2026-06-11 19:20:08'),
(666, 2, '💍 Partner Request', 'R Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:23'),
(667, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:45'),
(668, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:45'),
(669, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:45'),
(670, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:45'),
(671, 19, '✅ Partner Linked', 'anika has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 0, '2026-06-11 19:28:45'),
(672, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:48'),
(673, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:28:48'),
(674, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:29:53'),
(675, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-11 19:29:53'),
(676, 28, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: B0B9D8BB3258. Thank you!', 'in_app', 0, NULL, 0, '2026-06-12 05:07:48'),
(677, 28, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: 22EA11167A02. Thank you!', 'in_app', 0, NULL, 0, '2026-06-12 05:42:26'),
(678, 23, 'Admin Warning', 'Your BloodBridge trust score is below 50 (30). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.', 'in_app', 0, NULL, 0, '2026-06-13 09:34:13'),
(679, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 10:09:46'),
(680, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 10:09:46'),
(681, 23, 'Donation Promise Saved', 'Your donation has been scheduled. Confirmation code: C626B2DB1CB6. Thank you!', 'in_app', 0, NULL, 0, '2026-06-13 13:23:17'),
(682, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:30:51'),
(683, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:30:51'),
(684, 2, '💔 Partner Unlinked', 'R Khan has unlinked from you.', 'in_app', 0, NULL, 0, '2026-06-13 13:31:08'),
(685, 2, '💍 Partner Request', 'R Khan has sent you a partner request. Please confirm or reject it from your profile settings.', 'in_app', 0, NULL, 0, '2026-06-13 13:31:30'),
(686, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:03'),
(687, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:03'),
(688, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:03'),
(689, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:03'),
(690, 19, '✅ Partner Linked', 'anika has confirmed your partner request. You are now linked!', 'in_app', 0, NULL, 0, '2026-06-13 13:32:03'),
(691, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:07'),
(692, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:07'),
(693, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:50'),
(694, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:32:50'),
(695, 19, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:33:05'),
(696, 2, '🧬 Thalassemia Couple Alert', 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.', 'in_app', 0, NULL, 0, '2026-06-13 13:33:05'),
(697, 23, 'Donor Offer Received', 'R Khan has offered to donate for your request #REQ-0101. They are asking ৳500 per unit. A lab technician will verify and prepare the blood bag.', 'in_app', 0, NULL, 0, '2026-06-13 13:33:26'),
(698, 23, 'Blood Bag Ready', 'A blood bag has been approved for your request #REQ-0101. Barcode: BB20260613153447869', 'in_app', 0, NULL, 0, '2026-06-13 13:34:47'),
(699, 19, 'Donation Verified', 'Your blood donation has been verified. Blood bag created. Thank you!', 'in_app', 0, NULL, 0, '2026-06-13 13:34:47'),
(700, 23, '🏥 Blood Bank Offer Received', 'bank has offered to fulfil your blood request #REQ-0101 for B+. This is a free supply offer. Open your request timeline to review and accept.', 'in_app', 0, NULL, 0, '2026-06-13 13:39:42'),
(701, 19, 'Blood Accepted', 'Your blood donation for request #REQ-0101 was accepted by Kanik Deb. Thank you for saving a life!', 'in_app', 0, NULL, 0, '2026-06-13 13:42:26');

-- --------------------------------------------------------

--
-- Table structure for table `notification_template`
--

DROP TABLE IF EXISTS `notification_template`;
CREATE TABLE `notification_template` (
  `id` int(11) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `channel` enum('sms','email','push','in_app') DEFAULT 'in_app',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `partner_links`
--

DROP TABLE IF EXISTS `partner_links`;
CREATE TABLE `partner_links` (
  `id` int(11) NOT NULL,
  `user_id_1` int(11) NOT NULL,
  `user_id_2` int(11) NOT NULL,
  `status` enum('pending','active','rejected') DEFAULT 'pending',
  `action_user` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `partner_links`
--

INSERT INTO `partner_links` (`id`, `user_id_1`, `user_id_2`, `status`, `action_user`, `created_at`, `updated_at`) VALUES
(20, 2, 19, 'active', 2, '2026-06-13 13:31:30', '2026-06-13 13:32:03');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `token` varchar(255) NOT NULL,
  `account_type` enum('admin','user','blood_bank') NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `account_type`, `expires_at`, `used`, `created_at`) VALUES
(4, 'kanikdeb95@gmail.com', 'e1d891fbda9d685900d3d0a480fddd9406c00250842ebcd7670a09cf110e74fd', 'user', '2026-05-23 20:08:57', 1, '2026-05-23 17:08:57'),
(5, 'rk3712309@gmail.com', 'e85962e90aa8f05aa63240be94ef0decb8588309383c5d4fc75ea0784ee43c2f', 'user', '2026-06-06 20:32:39', 1, '2026-06-06 17:32:39'),
(6, 'rayhankhan9603@gmail.com', 'bff81b96088db2c0f2e8dd5682866df331b0b7d5df65aca8b752e9f7d0514bdb', 'user', '2026-06-07 13:56:57', 1, '2026-06-07 10:56:57'),
(7, 'kanikdeb922@gmail.com', 'f8ef01e7e07e606db09987a1c25bbb05591b60bd1d8b6687dbd7c5785f5805cb', 'user', '2026-06-10 13:10:44', 1, '2026-06-10 10:10:44');

-- --------------------------------------------------------

--
-- Table structure for table `patient_registry`
--

DROP TABLE IF EXISTS `patient_registry`;
CREATE TABLE `patient_registry` (
  `id` int(11) NOT NULL,
  `national_id` varchar(50) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `last_blood_request` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_registry`
--

INSERT INTO `patient_registry` (`id`, `national_id`, `full_name`, `blood_group`, `date_of_birth`, `phone`, `address`, `last_blood_request`, `created_at`) VALUES
(1, '1234567890', 'Kanik Deb', 'A+', NULL, '01629926257', 'Sobujbag Sooingoir Srimangal Sreemangal-3210 Moulvibazar', '2026-06-13 13:27:26', '2026-05-20 16:42:14'),
(2, '1234567890', 'Kanik Deb', 'A+', NULL, '01629926257', 'Sobujbag Sooingoir Srimangal Sreemangal-3210 Moulvibazar', '2026-06-13 13:27:26', '2026-05-20 16:42:14');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `payer_user_id` int(11) DEFAULT NULL,
  `payee_user_id` int(11) DEFAULT NULL,
  `payee_bank_id` int(11) DEFAULT NULL,
  `culture_test_id` int(11) DEFAULT NULL,
  `approval_step_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `units` int(11) NOT NULL DEFAULT 1,
  `price_per_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` enum('bkash','nagad','rocket','sslcommerz','card','cash','waived') DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `gateway_ref` varchar(255) DEFAULT NULL,
  `status` enum('pending','initiated','paid','failed','refunded','waived') NOT NULL DEFAULT 'pending',
  `initiated_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_config`
--

DROP TABLE IF EXISTS `payment_config`;
CREATE TABLE `payment_config` (
  `id` int(11) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_config`
--

INSERT INTO `payment_config` (`id`, `config_key`, `config_value`, `description`, `updated_at`) VALUES
(1, 'platform_fee_percent', '5', 'Platform fee on paid transactions (%)', '2026-06-02 06:11:07'),
(2, 'max_price_per_unit', '2000', 'Maximum BDT allowed per blood unit', '2026-06-02 06:11:07'),
(3, 'min_price_per_unit', '50', 'Minimum BDT allowed per blood unit', '2026-06-02 06:11:07'),
(4, 'payment_enabled', '1', '1=active 0=disabled', '2026-06-02 06:11:07'),
(5, 'bkash_enabled', '1', '1=bKash enabled', '2026-06-02 06:11:07'),
(6, 'nagad_enabled', '1', '1=Nagad enabled', '2026-06-02 06:11:07'),
(7, 'sslcommerz_enabled', '0', '1=SSLCommerz enabled (needs API keys)', '2026-06-02 06:11:07'),
(8, 'bkash_merchant_number', '', 'bKash merchant number', '2026-06-02 06:11:07'),
(9, 'nagad_merchant_number', '', 'Nagad merchant number', '2026-06-02 06:11:07');

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL,
  `tran_id` varchar(100) NOT NULL,
  `sessionkey` varchar(100) DEFAULT NULL,
  `request_id` int(11) NOT NULL,
  `bag_id` int(11) DEFAULT 0,
  `requester_user_id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'BDT',
  `status` enum('initiated','success','failed','cancelled') DEFAULT 'initiated',
  `payment_method` varchar(50) DEFAULT NULL,
  `card_issuer` varchar(100) DEFAULT NULL,
  `card_brand` varchar(50) DEFAULT NULL,
  `card_number` varchar(50) DEFAULT NULL,
  `bank_tran_id` varchar(100) DEFAULT NULL,
  `val_id` varchar(100) DEFAULT NULL,
  `risk_level` varchar(20) DEFAULT NULL,
  `risk_title` varchar(100) DEFAULT NULL,
  `gw_version` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `tran_id`, `sessionkey`, `request_id`, `bag_id`, `requester_user_id`, `donor_user_id`, `amount`, `currency`, `status`, `payment_method`, `card_issuer`, `card_brand`, `card_number`, `bank_tran_id`, `val_id`, `risk_level`, `risk_title`, `gw_version`, `created_at`, `updated_at`) VALUES
(1, 'BLOOD88_1780759515_ADB81A18', '39E77A570DFBCC5A963AE4DA30737F9C', 88, 130, 23, 19, 500.00, 'BDT', 'failed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-06 21:25:15', '2026-06-06 21:26:31'),
(2, 'BLOOD88_1780759633_6C32C721', 'B607FE88CF8F31B3FDAA32EFF6A5CF19', 88, 130, 23, 19, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '260606212512w0oDBizH8iCUbUw', '2606062125126VkE93b6AczY5ey', '0', 'Safe', '', '2026-06-06 21:27:13', '2026-06-06 21:27:32'),
(3, 'BLOOD89_1780765987_D0EA2CD1', '68EDEE101BFBE484C58D31134C5A3B74', 89, 132, 23, 2, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '260606231130MZMQaYp6JjDkdlY', '260606231130Erqp6RYbzerY9Cd', '0', 'Safe', '', '2026-06-06 23:13:07', '2026-06-06 23:13:50'),
(4, 'BLOOD90_1780831055_76B097E2', '2A3F0481D6F1614661DECAA098D34192', 90, 135, 23, 19, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '260607171610UgFnpConAsrkcf1', '260607171610UFbIBpKsRW4Ybu9', '0', 'Safe', '', '2026-06-07 17:17:35', '2026-06-07 17:18:31'),
(5, 'BLOOD92_1781001779_E8E192D6', '3F6C7347397BD6AA5377CDDC7478A85C', 92, 137, 23, 19, 2000.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '260609164054o85OuTp0NLhUAJJ', '260609164054Up57w5MESH2E2MA', '0', 'Safe', '', '2026-06-09 16:42:59', '2026-06-09 16:43:14'),
(6, 'BLOOD93_1781002411_3F2F7A23', '4879A59D2FDA8AF5965924F50C3D7D5C', 93, 138, 23, 19, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '2606091651236ttjlyqMSJaU5Io', '260609165123wI8rIoW7biOwVYu', '0', 'Safe', '', '2026-06-09 16:53:31', '2026-06-09 16:53:43'),
(7, 'BLOOD97_1781194794_BDE78D8D', 'B31BA2E9EFC7E92E040872C4E461D3BF', 97, 141, 19, 23, 500.00, 'BDT', 'success', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-11 22:19:54', '2026-06-11 22:21:32'),
(8, 'BLOOD99_1781199182_507DAC9C', '4E05F3566C37B1D5772D71F1BED46811', 99, 145, 28, 19, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '260611233323UxDYa1zA29h6idF', '260611233323YZfLJVdi1riUkXj', '0', 'Safe', '', '2026-06-11 23:33:02', '2026-06-11 23:33:26'),
(9, 'BLOOD100_1781205282_6A47C15B', '926C228A6FF4E735B9CE42836B28B161', 100, 0, 23, NULL, 500.00, 'BDT', 'initiated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-12 01:14:42', '2026-06-12 01:14:44'),
(10, 'BLOOD100_1781205335_15DD96C7', 'B5DA913421E4B0DA399B434CAD3512F7', 100, 147, 23, 19, 500.00, 'BDT', 'initiated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-12 01:15:35', '2026-06-12 01:15:56'),
(11, 'BLOOD100_1781205459_2433D248', 'FE514EF1822128EAA464F19B1C33FEC3', 100, 0, 23, NULL, 500.00, 'BDT', 'initiated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-12 01:17:39', '2026-06-12 01:17:41'),
(12, 'BLOOD100_1781205591_29CC9A78', '61A55FF546189FA9EF5249B211543C69', 100, 0, 23, NULL, 500.00, 'BDT', 'success', 'BKASH-BKash', 'BKash Mobile Banking', 'MOBILEBANKING', '', '26061212007Q56eZEI8sdJM2At', '260612120076eFxV7R787ewYch', '0', 'Safe', '', '2026-06-12 01:19:51', '2026-06-12 01:20:08');

-- --------------------------------------------------------

--
-- Table structure for table `pregnancy_record`
--

DROP TABLE IF EXISTS `pregnancy_record`;
CREATE TABLE `pregnancy_record` (
  `id` int(11) NOT NULL,
  `mother_user_id` int(11) DEFAULT NULL,
  `father_blood_group` varchar(5) NOT NULL,
  `mother_blood_group` varchar(5) NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `predicted_baby_blood_group` varchar(20) DEFAULT NULL,
  `risk_advice` text DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `pregnancy_record`
--
DROP TRIGGER IF EXISTS `trg_pregnancy_record_before_insert`;
DELIMITER $$
CREATE TRIGGER `trg_pregnancy_record_before_insert` BEFORE INSERT ON `pregnancy_record` FOR EACH ROW BEGIN
    IF NEW.father_blood_group IS NOT NULL AND NEW.mother_blood_group IS NOT NULL THEN
        SET NEW.predicted_baby_blood_group = CASE
            WHEN NEW.mother_blood_group IN ('A+','A-') AND NEW.father_blood_group IN ('A+','A-') THEN 'A, O'
            WHEN NEW.mother_blood_group IN ('A+','A-') AND NEW.father_blood_group IN ('B+','B-') THEN 'A, B, AB, O'
            WHEN NEW.mother_blood_group IN ('A+','A-') AND NEW.father_blood_group IN ('AB+','AB-') THEN 'A, B, AB'
            WHEN NEW.mother_blood_group IN ('A+','A-') AND NEW.father_blood_group IN ('O+','O-') THEN 'A, O'
            WHEN NEW.mother_blood_group IN ('B+','B-') AND NEW.father_blood_group IN ('B+','B-') THEN 'B, O'
            WHEN NEW.mother_blood_group IN ('B+','B-') AND NEW.father_blood_group IN ('AB+','AB-') THEN 'A, B, AB'
            WHEN NEW.mother_blood_group IN ('B+','B-') AND NEW.father_blood_group IN ('O+','O-') THEN 'B, O'
            WHEN NEW.mother_blood_group IN ('AB+','AB-') AND NEW.father_blood_group IN ('AB+','AB-') THEN 'A, B, AB'
            WHEN NEW.mother_blood_group IN ('AB+','AB-') AND NEW.father_blood_group IN ('O+','O-') THEN 'A, B'
            WHEN NEW.mother_blood_group IN ('O+','O-') AND NEW.father_blood_group IN ('O+','O-') THEN 'O'
            WHEN NEW.mother_blood_group IN ('O+','O-') AND NEW.father_blood_group IN ('AB+','AB-') THEN 'A, B'
            ELSE 'Unknown'
        END;

        SET NEW.risk_advice = CASE
            WHEN RIGHT(NEW.mother_blood_group,1) = '-' AND RIGHT(NEW.father_blood_group,1) = '+'
            THEN 'WARNING: Mother is Rh Negative and Father is Rh Positive. There is a possibility your baby will be Rh Positive, which may cause Neonatal Hemolytic Disease. Please consult a doctor for Rh immunoglobulin (RhoGAM) shot.'
            ELSE 'No Rh incompatibility risk detected based on parents blood groups.'
        END;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `remember_tokens`
--

DROP TABLE IF EXISTS `remember_tokens`;
CREATE TABLE `remember_tokens` (
  `id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `account_type` enum('admin','user','blood_bank') NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_timeline`
--

DROP TABLE IF EXISTS `request_timeline`;
CREATE TABLE `request_timeline` (
  `id` int(11) NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `changed_by_user_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `previous_hash` varchar(255) DEFAULT NULL,
  `current_hash` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_timeline`
--

INSERT INTO `request_timeline` (`id`, `request_id`, `status`, `changed_at`, `changed_by_user_id`, `remarks`, `previous_hash`, `current_hash`) VALUES
(1, 1, 'pending', '2026-05-17 12:02:41', 1, 'Request posted to donors by donor/recipient (no bank selected)', NULL, NULL),
(2, 2, 'pending', '2026-05-19 03:38:30', 1, 'Request submitted to bank and visible to donors', NULL, NULL),
(3, 29, 'pending', '2026-05-20 18:03:38', 1, 'Request submitted', NULL, NULL),
(4, 29, 'approved', '2026-05-20 18:03:38', NULL, 'Status changed from pending to approved', NULL, NULL),
(5, 30, 'pending', '2026-05-21 07:54:41', 1, 'Request submitted', NULL, NULL),
(6, 30, 'approved', '2026-05-21 07:54:41', NULL, 'Status changed from pending to approved', NULL, NULL),
(7, 30, 'approved', '2026-05-21 07:54:41', 2, 'Accepted by donor user #2', NULL, NULL),
(8, 31, 'pending', '2026-05-21 07:58:20', 1, 'Request submitted', NULL, NULL),
(9, 31, 'approved', '2026-05-21 08:14:57', NULL, 'Status changed from pending to approved', NULL, NULL),
(10, 31, 'approved', '2026-05-21 08:14:57', 2, 'Accepted by donor user #2', NULL, NULL),
(11, 2, 'approved', '2026-05-21 08:51:39', NULL, 'Status changed from pending to approved', NULL, NULL),
(12, 33, 'pending', '2026-05-21 16:57:52', 10, 'Request submitted', NULL, NULL),
(13, 33, 'approved', '2026-05-21 16:59:00', NULL, 'Status changed from pending to approved', NULL, NULL),
(14, 33, 'approved', '2026-05-21 16:59:00', 2, 'Accepted by donor user #2', NULL, NULL),
(15, 36, 'pending', '2026-05-24 03:20:43', 23, 'Split request submitted to bank', NULL, NULL),
(16, 37, 'pending', '2026-05-24 03:20:43', 23, 'Split request submitted to bank', NULL, NULL),
(17, 38, 'pending', '2026-05-24 03:36:06', 23, 'Split request submitted to bank', NULL, NULL),
(18, 39, 'pending', '2026-05-24 03:36:06', 23, 'Split request submitted to bank', NULL, NULL),
(19, 38, 'approved', '2026-05-24 07:49:46', NULL, 'Status changed from pending to approved', NULL, NULL),
(20, 38, 'approved', '2026-05-24 07:49:46', 2, 'Accepted by donor user #2', NULL, NULL),
(21, 39, 'approved', '2026-05-24 07:49:58', NULL, 'Status changed from pending to approved', NULL, NULL),
(22, 39, 'approved', '2026-05-24 07:49:58', 2, 'Accepted by donor user #2', NULL, NULL),
(23, 36, 'approved', '2026-05-24 07:50:10', NULL, 'Status changed from pending to approved', NULL, NULL),
(24, 36, 'approved', '2026-05-24 07:50:10', 2, 'Accepted by donor user #2', NULL, NULL),
(25, 41, 'pending', '2026-05-24 07:58:11', 2, 'Request submitted', NULL, NULL),
(26, 42, 'pending', '2026-05-24 08:04:56', 2, 'Request submitted', NULL, NULL),
(27, 43, 'pending', '2026-05-24 08:55:11', 2, 'Request submitted', NULL, NULL),
(28, 37, 'approved', '2026-05-24 09:20:47', NULL, 'Status changed from pending to approved', NULL, NULL),
(29, 37, 'approved', '2026-05-24 09:20:47', 2, 'Accepted by donor user #2', NULL, NULL),
(30, 44, 'pending', '2026-05-24 09:22:00', 2, 'Request submitted', NULL, NULL),
(31, 45, 'pending', '2026-05-24 09:23:42', 23, 'Request submitted', NULL, NULL),
(32, 45, 'approved', '2026-05-24 13:56:24', NULL, 'Status changed from pending to approved', NULL, NULL),
(33, 46, 'pending', '2026-05-24 14:53:03', 23, 'Request submitted', NULL, NULL),
(34, 47, 'pending', '2026-05-24 18:08:16', 2, 'Request submitted', NULL, NULL),
(35, 47, 'approved', '2026-05-24 18:12:32', NULL, 'Status changed from pending to approved', NULL, NULL),
(36, 49, 'pending', '2026-05-24 19:32:05', 2, 'Request submitted', NULL, NULL),
(37, 50, 'pending', '2026-05-24 19:33:46', 2, 'Request submitted', NULL, NULL),
(38, 50, 'approved', '2026-05-24 19:35:28', NULL, 'Status changed from pending to approved', NULL, NULL),
(39, 51, 'pending', '2026-05-24 19:47:25', 2, 'Request submitted', NULL, NULL),
(40, 51, 'approved', '2026-05-24 19:48:30', NULL, 'Status changed from pending to approved', NULL, NULL),
(41, 52, 'pending', '2026-05-24 19:57:17', 2, 'Request submitted', NULL, NULL),
(42, 52, 'approved', '2026-05-24 19:58:13', NULL, 'Status changed from pending to approved', NULL, NULL),
(43, 53, 'pending', '2026-05-24 20:00:34', 2, 'Request submitted', NULL, NULL),
(44, 53, 'approved', '2026-05-24 20:06:27', NULL, 'Status changed from pending to approved', NULL, NULL),
(45, 54, 'pending', '2026-05-24 20:19:19', 2, 'Request submitted', NULL, NULL),
(46, 54, 'approved', '2026-05-24 20:20:19', NULL, 'Status changed from pending to approved', NULL, NULL),
(47, 55, 'pending', '2026-05-25 05:18:51', 23, 'Request submitted', NULL, NULL),
(48, 55, 'approved', '2026-05-25 05:28:03', NULL, 'Status changed from pending to approved', NULL, NULL),
(49, 56, 'pending', '2026-05-25 05:31:52', 2, 'Request submitted', NULL, NULL),
(50, 56, 'approved', '2026-05-25 06:25:52', NULL, 'Status changed from pending to approved', NULL, NULL),
(51, 57, 'pending', '2026-05-25 06:27:03', 2, 'Request submitted', NULL, NULL),
(52, 58, 'pending', '2026-05-25 06:29:25', 2, 'Request submitted', NULL, NULL),
(53, 58, 'approved', '2026-05-25 06:57:43', NULL, 'Status changed from pending to approved', NULL, NULL),
(54, 57, 'approved', '2026-05-25 07:00:42', NULL, 'Status changed from pending to approved', NULL, NULL),
(55, 59, 'pending', '2026-05-25 07:08:27', 2, 'Request submitted', NULL, NULL),
(56, 59, 'approved', '2026-05-25 07:09:58', NULL, 'Status changed from pending to approved', NULL, NULL),
(57, 60, 'pending', '2026-05-25 09:33:03', 2, 'Split request submitted to bank', NULL, NULL),
(58, 61, 'pending', '2026-05-25 09:33:03', 2, 'Split request submitted to bank', NULL, NULL),
(59, 60, 'approved', '2026-05-25 09:40:17', NULL, 'Status changed from pending to approved', NULL, NULL),
(60, 62, 'pending', '2026-05-25 10:08:15', 2, 'Split request submitted to bank', NULL, NULL),
(61, 63, 'pending', '2026-05-25 10:08:15', 2, 'Split request submitted to bank', NULL, NULL),
(62, 64, 'pending', '2026-05-25 10:40:02', 2, 'Split request submitted to bank', NULL, NULL),
(63, 65, 'pending', '2026-05-25 10:40:02', 2, 'Split request submitted to bank', NULL, NULL),
(64, 66, 'pending', '2026-05-25 10:45:36', 2, 'Request submitted', NULL, NULL),
(65, 66, 'approved', '2026-05-25 10:46:11', NULL, 'Status changed from pending to approved', NULL, NULL),
(66, 67, 'pending', '2026-05-25 11:07:50', 23, 'Request submitted', NULL, NULL),
(67, 67, 'approved', '2026-05-25 11:09:55', NULL, 'Status changed from pending to approved', NULL, NULL),
(68, 68, 'pending', '2026-05-25 11:11:35', 23, 'Request submitted', NULL, NULL),
(69, 68, 'approved', '2026-05-25 11:29:04', NULL, 'Status changed from pending to approved', NULL, NULL),
(70, 69, 'pending', '2026-05-25 11:29:49', 23, 'Request submitted', NULL, NULL),
(71, 69, 'approved', '2026-05-25 11:36:43', NULL, 'Status changed from pending to approved', NULL, NULL),
(72, 70, 'pending', '2026-05-25 11:37:14', 23, 'Request submitted', NULL, NULL),
(73, 70, 'approved', '2026-05-25 11:38:30', NULL, 'Status changed from pending to approved', NULL, NULL),
(74, 71, 'pending', '2026-05-25 11:39:10', 23, 'Split request submitted to bank', NULL, NULL),
(75, 72, 'pending', '2026-05-25 11:39:10', 23, 'Split request submitted to bank', NULL, NULL),
(76, 73, 'pending', '2026-05-25 11:43:13', 23, 'Request submitted', NULL, NULL),
(77, 73, 'approved', '2026-05-25 11:44:22', NULL, 'Status changed from pending to approved', NULL, NULL),
(78, 74, 'pending', '2026-05-25 12:21:11', 23, 'Request submitted', NULL, NULL),
(79, 74, 'approved', '2026-05-25 12:22:47', NULL, 'Status changed from pending to approved', NULL, NULL),
(80, 75, 'pending', '2026-05-25 12:24:30', 23, 'Request submitted', NULL, NULL),
(81, 75, 'approved', '2026-05-25 12:25:16', NULL, 'Status changed from pending to approved', NULL, NULL),
(82, 76, 'pending', '2026-05-25 12:26:42', 23, 'Request submitted', NULL, NULL),
(83, 76, 'approved', '2026-05-25 12:28:00', NULL, 'Status changed from pending to approved', NULL, NULL),
(84, 77, 'pending', '2026-05-25 16:36:11', 23, 'Request submitted', NULL, NULL),
(85, 77, 'approved', '2026-05-25 16:41:01', NULL, 'Status changed from pending to approved', NULL, NULL),
(86, 78, 'pending', '2026-05-25 16:43:09', 23, 'Request submitted', NULL, NULL),
(87, 78, 'approved', '2026-05-25 16:44:26', NULL, 'Status changed from pending to approved', NULL, NULL),
(88, 79, 'pending', '2026-05-25 16:45:29', 23, 'Request submitted', NULL, NULL),
(89, 79, 'approved', '2026-05-25 16:49:17', NULL, 'Status changed from pending to approved', NULL, NULL),
(90, 1, 'approved', '2026-05-26 18:14:50', NULL, 'Status changed from pending to approved', NULL, NULL),
(91, 79, 'delivered', '2026-05-26 18:32:25', NULL, 'Status changed from approved to delivered', NULL, NULL),
(92, 48, 'delivered', '2026-05-26 18:32:43', NULL, 'Status changed from approved to delivered', NULL, NULL),
(93, 80, 'pending', '2026-06-03 09:56:43', 2, 'Request submitted', NULL, NULL),
(94, 80, 'approved', '2026-06-03 10:02:00', NULL, 'Status changed from pending to approved', NULL, NULL),
(95, 81, 'pending', '2026-06-03 15:28:51', 2, 'Request submitted', NULL, NULL),
(96, 82, 'pending', '2026-06-03 15:38:09', 22, 'Request submitted', NULL, NULL),
(97, 83, 'pending', '2026-06-06 08:39:04', 23, 'Request submitted', NULL, NULL),
(98, 83, 'approved', '2026-06-06 08:43:06', NULL, 'Status changed from pending to approved', NULL, NULL),
(99, 84, 'pending', '2026-06-06 09:14:14', 23, 'Request submitted', NULL, NULL),
(100, 84, 'approved', '2026-06-06 09:18:58', NULL, 'Status changed from pending to approved', NULL, NULL),
(101, 84, 'pending', '2026-06-06 09:20:03', NULL, 'Status changed from approved to pending', NULL, NULL),
(102, 84, 'approved', '2026-06-06 09:21:25', NULL, 'Status changed from pending to approved', NULL, NULL),
(103, 84, 'pending', '2026-06-06 09:21:29', NULL, 'Status changed from approved to pending', NULL, NULL),
(104, 84, 'approved', '2026-06-06 09:29:29', NULL, 'Status changed from pending to approved', NULL, NULL),
(105, 84, 'pending', '2026-06-06 09:29:33', NULL, 'Status changed from approved to pending', NULL, NULL),
(106, 84, 'approved', '2026-06-06 09:45:52', NULL, 'Status changed from pending to approved', NULL, NULL),
(107, 84, 'pending', '2026-06-06 09:46:14', NULL, 'Status changed from approved to pending', NULL, NULL),
(108, 84, 'approved', '2026-06-06 12:13:12', NULL, 'Status changed from pending to approved', NULL, NULL),
(109, 84, 'pending', '2026-06-06 12:13:28', NULL, 'Status changed from approved to pending', NULL, NULL),
(110, 84, 'approved', '2026-06-06 12:13:37', NULL, 'Status changed from pending to approved', NULL, NULL),
(111, 84, 'completed', '2026-06-06 12:44:22', NULL, 'Status changed from approved to completed', NULL, NULL),
(112, 85, 'pending', '2026-06-06 12:45:57', 23, 'Request submitted', NULL, NULL),
(113, 85, 'approved', '2026-06-06 13:53:38', NULL, 'Status changed from pending to approved', NULL, NULL),
(114, 85, 'completed', '2026-06-06 13:53:43', NULL, 'Status changed from approved to completed', NULL, NULL),
(115, 83, 'completed', '2026-06-06 14:09:16', NULL, 'Status changed from approved to completed', NULL, NULL),
(116, 86, 'pending', '2026-06-06 14:10:20', 23, 'Request submitted', NULL, NULL),
(117, 86, 'approved', '2026-06-06 14:12:12', NULL, 'Status changed from pending to approved', NULL, NULL),
(118, 86, 'completed', '2026-06-06 14:12:23', NULL, 'Status changed from approved to completed', NULL, NULL),
(119, 87, 'pending', '2026-06-06 14:23:32', 23, 'Request submitted', NULL, NULL),
(120, 82, 'approved', '2026-06-06 14:53:05', NULL, 'Status changed from pending to approved', NULL, NULL),
(121, 82, 'completed', '2026-06-06 14:53:11', NULL, 'Status changed from approved to completed', NULL, NULL),
(122, 88, 'pending', '2026-06-06 15:03:00', 23, 'Request submitted', NULL, NULL),
(123, 88, 'approved', '2026-06-06 15:20:55', NULL, 'Status changed from pending to approved', NULL, NULL),
(124, 88, 'completed', '2026-06-06 15:27:32', NULL, 'Status changed from approved to completed', NULL, NULL),
(125, 89, 'pending', '2026-06-06 17:08:45', 23, 'Request submitted', NULL, NULL),
(126, 89, 'approved', '2026-06-06 17:10:53', NULL, 'Status changed from pending to approved', NULL, NULL),
(127, 89, 'pending', '2026-06-06 17:12:22', NULL, 'Status changed from approved to pending', NULL, NULL),
(128, 89, 'approved', '2026-06-06 17:12:57', NULL, 'Status changed from pending to approved', NULL, NULL),
(129, 89, 'completed', '2026-06-06 17:13:50', NULL, 'Status changed from approved to completed', NULL, NULL),
(130, 90, 'pending', '2026-06-07 11:14:53', 23, 'Request submitted', NULL, NULL),
(131, 90, 'approved', '2026-06-07 11:17:27', NULL, 'Status changed from pending to approved', NULL, NULL),
(132, 90, 'completed', '2026-06-07 11:18:31', NULL, 'Status changed from approved to completed', NULL, NULL),
(133, 87, 'approved', '2026-06-09 09:48:08', NULL, 'Status changed from pending to approved', NULL, NULL),
(134, 81, 'approved', '2026-06-09 09:48:21', NULL, 'Status changed from pending to approved', NULL, NULL),
(135, 91, 'pending', '2026-06-09 10:08:30', 23, 'Request submitted', NULL, NULL),
(136, 92, 'pending', '2026-06-09 10:34:07', 23, 'Request submitted', NULL, NULL),
(137, 92, 'approved', '2026-06-09 10:42:55', NULL, 'Status changed from pending to approved', NULL, NULL),
(138, 92, 'completed', '2026-06-09 10:43:14', NULL, 'Status changed from approved to completed', NULL, NULL),
(139, 87, 'completed', '2026-06-09 10:44:51', NULL, 'Status changed from approved to completed', NULL, NULL),
(140, 93, 'pending', '2026-06-09 10:46:08', 23, 'Request submitted', NULL, NULL),
(141, 93, 'approved', '2026-06-09 10:53:29', NULL, 'Status changed from pending to approved', NULL, NULL),
(142, 93, 'completed', '2026-06-09 10:53:43', NULL, 'Status changed from approved to completed', NULL, NULL),
(143, 94, 'pending', '2026-06-10 10:14:22', 19, 'Request submitted', NULL, NULL),
(144, 94, 'approved', '2026-06-10 10:16:50', NULL, 'Status changed from pending to approved', NULL, NULL),
(145, 94, 'completed', '2026-06-10 10:16:54', NULL, 'Status changed from approved to completed', NULL, NULL),
(146, 96, 'pending', '2026-06-11 12:54:07', 28, 'Request submitted', NULL, NULL),
(147, 97, 'pending', '2026-06-11 16:17:37', 19, 'Request submitted', NULL, NULL),
(148, 97, 'approved', '2026-06-11 16:19:51', NULL, 'Status changed from pending to approved', NULL, NULL),
(149, 97, 'completed', '2026-06-11 16:21:32', NULL, 'Status changed from approved to completed', NULL, NULL),
(150, 98, 'pending', '2026-06-11 16:34:55', 19, 'Request submitted', NULL, NULL),
(151, 99, 'pending', '2026-06-11 17:24:15', 28, 'Request submitted', NULL, NULL),
(152, 99, 'approved', '2026-06-11 17:32:53', NULL, 'Status changed from pending to approved', NULL, NULL),
(153, 99, 'completed', '2026-06-11 17:33:26', NULL, 'Status changed from approved to completed', NULL, NULL),
(154, 100, 'pending', '2026-06-11 19:10:46', 23, 'Request submitted', NULL, NULL),
(155, 100, 'approved', '2026-06-11 19:14:38', NULL, 'Status changed from pending to approved', NULL, NULL),
(156, 100, 'completed', '2026-06-11 19:20:08', NULL, 'Status changed from approved to completed', NULL, NULL),
(157, 81, 'completed', '2026-06-11 19:29:45', NULL, 'Status changed from approved to completed', NULL, NULL),
(158, 101, 'pending', '2026-06-13 13:27:25', 23, 'Request submitted', NULL, NULL),
(159, 101, 'approved', '2026-06-13 13:42:26', NULL, 'Status changed from pending to approved', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `storage_unit`
--

DROP TABLE IF EXISTS `storage_unit`;
CREATE TABLE `storage_unit` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `unit_name` varchar(100) DEFAULT NULL,
  `sensor_id` varchar(100) DEFAULT NULL,
  `min_temp` decimal(5,2) DEFAULT 2.00,
  `max_temp` decimal(5,2) DEFAULT 6.00,
  `location` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `storage_unit`
--

INSERT INTO `storage_unit` (`id`, `blood_bank_id`, `unit_name`, `sensor_id`, `min_temp`, `max_temp`, `location`) VALUES
(1, 3, 'Freezer A1', 'SENSOR-A1', 2.00, 6.00, 'Room 101'),
(2, 3, 'Freezer B2', 'SEN-002', 2.00, 6.00, NULL),
(3, 3, 'Demo Freezer', 'SENSOR-DEMO', 2.00, 6.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `suspicious_activity_log`
--

DROP TABLE IF EXISTS `suspicious_activity_log`;
CREATE TABLE `suspicious_activity_log` (
  `id` int(11) NOT NULL,
  `donor_user_id` int(11) DEFAULT NULL,
  `recipient_user_id` int(11) DEFAULT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `activity_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `detected_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_investigated` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `data_type` enum('string','int','float','json','boolean') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `temperature_log`
--

DROP TABLE IF EXISTS `temperature_log`;
CREATE TABLE `temperature_log` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `sensor_id` varchar(100) NOT NULL,
  `temperature_celsius` decimal(5,2) NOT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_alert` tinyint(1) DEFAULT 0,
  `escalation_level` tinyint(1) DEFAULT 0,
  `resolved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `temperature_log`
--

INSERT INTO `temperature_log` (`id`, `blood_bank_id`, `sensor_id`, `temperature_celsius`, `recorded_at`, `is_alert`, `escalation_level`, `resolved_at`) VALUES
(1, 1, 'SENSOR-A1', 4.20, '2026-05-08 05:33:56', 0, 0, NULL),
(2, 3, 'SEN-002', 5.10, '2026-05-08 11:04:27', 0, 0, NULL),
(3, 3, 'SENSOR-DEMO', 4.50, '2026-05-08 11:12:36', 0, 0, NULL);

--
-- Triggers `temperature_log`
--
DROP TRIGGER IF EXISTS `trg_temperature_log_before_insert`;
DELIMITER $$
CREATE TRIGGER `trg_temperature_log_before_insert` BEFORE INSERT ON `temperature_log` FOR EACH ROW BEGIN
    DECLARE v_min_temp DECIMAL(5,2) DEFAULT 2.0;
    DECLARE v_max_temp DECIMAL(5,2) DEFAULT 6.0;
    
    SELECT min_temp, max_temp INTO v_min_temp, v_max_temp
    FROM storage_unit WHERE sensor_id = NEW.sensor_id LIMIT 1;
    
    IF NEW.temperature_celsius > v_max_temp OR NEW.temperature_celsius < v_min_temp THEN
        SET NEW.is_alert = 1;
    ELSE
        SET NEW.is_alert = 0;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `thalassemia_carrier`
--

DROP TABLE IF EXISTS `thalassemia_carrier`;
CREATE TABLE `thalassemia_carrier` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `is_carrier` tinyint(1) DEFAULT 1,
  `confirmed_by` int(11) DEFAULT NULL,
  `confirmed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `thalassemia_carrier`
--

INSERT INTO `thalassemia_carrier` (`id`, `user_id`, `is_carrier`, `confirmed_by`, `confirmed_at`) VALUES
(9, 19, 1, 8, '2026-06-11 15:07:01'),
(10, 2, 1, 8, '2026-06-11 15:07:10');

-- --------------------------------------------------------

--
-- Table structure for table `thalassemia_couple_alert`
--

DROP TABLE IF EXISTS `thalassemia_couple_alert`;
CREATE TABLE `thalassemia_couple_alert` (
  `id` int(11) NOT NULL,
  `user_id_1` int(11) NOT NULL,
  `user_id_2` int(11) NOT NULL,
  `risk_percentage` int(11) DEFAULT 25,
  `advice` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `thalassemia_couple_alert`
--

INSERT INTO `thalassemia_couple_alert` (`id`, `user_id_1`, `user_id_2`, `risk_percentage`, `advice`, `created_at`, `updated_at`) VALUES
(104, 2, 19, 25, 'Both you and your partner are identified as thalassemia carriers. If both parents are carriers, there is a:\n• 25% (1 in 4) chance of having a child with Thalassemia Major\n• 50% (1 in 2) chance of having a child who is a carrier (like you)\n• 25% (1 in 4) chance of having a child who is unaffected\n\nWe strongly recommend visiting a genetic counseling center for detailed family planning guidance.', '2026-06-13 13:32:03', '2026-06-13 13:32:03');

-- --------------------------------------------------------

--
-- Table structure for table `transfusion`
--

DROP TABLE IF EXISTS `transfusion`;
CREATE TABLE `transfusion` (
  `id` int(11) NOT NULL,
  `blood_bag_id` int(11) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `recipient_user_id` int(11) DEFAULT NULL,
  `hospital_id` int(11) DEFAULT NULL,
  `doctor_user_id` int(11) DEFAULT NULL,
  `issued_by_user_id` int(11) DEFAULT NULL,
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `crossmatch_result` varchar(50) DEFAULT NULL,
  `reaction_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `blood_bank_id` int(11) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('donor_recipient','doctor','lab_technician','delivery_staff') DEFAULT NULL,
  `fcm_token` varchar(255) DEFAULT NULL,
  `device_type` enum('android','ios','web') DEFAULT 'web',
  `is_active` tinyint(1) DEFAULT 1,
  `blocked_at` datetime DEFAULT NULL,
  `block_expires_at` datetime DEFAULT NULL,
  `verification_token` varchar(64) DEFAULT NULL,
  `token_expires` datetime DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `profile_picture` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `blood_bank_id`, `email`, `password_hash`, `full_name`, `phone`, `role`, `fcm_token`, `device_type`, `is_active`, `blocked_at`, `block_expires_at`, `verification_token`, `token_expires`, `last_login`, `created_at`, `updated_at`, `profile_picture`) VALUES
(2, NULL, 'arif@gmail.com', '$2y$10$lACnHxCP3ekFLII.vhrDKODj2/kzk2yovj7XRTvA9c7xBuSiAREEK', 'anika', '0324823423', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-07 22:00:21', '2026-06-11 15:05:02', NULL),
(3, NULL, 'anik@gmail.com', '$2y$10$S0ud81.bYYXg1OVyJOqsUOHTrYrt1pAR50VSWlJtcOzNJn/h7lvY2', 'anik', '017932763423', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-07 23:25:33', '2026-05-11 10:58:55', NULL),
(4, NULL, 'rk@gmail.com', '$2y$10$DjfAFhqNPyIyoOAumz7p8eBXjbqboSsRrT05xal03.7bnzzSHjuI.', 'Rayhan', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-08 09:06:42', '2026-05-11 10:59:01', NULL),
(5, NULL, 't@gmail.com', '$2y$10$zelnKH/sr1c1h8.WcmGS/.RKU04uNM4Ztek/00mO49UfUhJK/xNhK', 'rdedrftft', '252525258825', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-08 22:04:02', '2026-05-11 10:59:09', NULL),
(6, NULL, 'tf@gmail.com', '$2y$10$k3lcCLqh7gGCVNyYxHPJ7egbGCbxQnL1wZnsOsdKUx4x8c/QFuURu', 'Tasmi', '0132658956', 'doctor', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-08 23:06:00', '2026-05-22 13:16:35', NULL),
(7, NULL, 'abc@gmail.com', '$2y$10$RxjiOweUTfi5ZFcRMcN5IuSYfx4jQqp1nDdurerd0PMipTRSlSNvO', 'Arif', '0123546555966', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-09 10:35:43', '2026-05-11 10:59:17', NULL),
(8, NULL, 'al@gmail.com', '$2y$10$k3lcCLqh7gGCVNyYxHPJ7egbGCbxQnL1wZnsOsdKUx4x8c/QFuURu', 'Al-Amin', '012562652365', 'lab_technician', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-09 10:46:59', '2026-05-22 13:16:35', NULL),
(9, NULL, 'k@gmail.com', '$2y$10$p6t9lnrALi5zweiaNn6o8e.LFGa4Y120.6patsyYhss5bxq58Aopu', 'kanik', '02166563266', 'delivery_staff', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-09 11:10:09', '2026-05-09 11:10:09', NULL),
(10, NULL, 'rayhan@gmail.com', '$2y$10$sgHjpaX1ZUAjjMLcsmx66OeZet86K4y7pdxKZ3z9mZPJ1/hmps//y', 'Rayhan Khan', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-11 11:05:02', '2026-05-11 11:05:02', NULL),
(11, NULL, 'r@gmail.com', '$2y$10$y8uzPnAL/vb2oGa3KuPjpuCb/kaOUUlRKvRo4D.G2obLiTZDm2lAS', 'ratul', '1234566323', 'doctor', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-12 03:01:01', '2026-05-12 03:01:01', NULL),
(12, NULL, 'd@gmail.com', '$2y$10$su2H2UJHS.1CTW9FlKhdT.zgDu.9/P8Yl3ZASkGrN7D8euq.GefoK', 'Dibbyo Dhar', '0162345678', 'lab_technician', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-13 13:21:55', '2026-05-13 13:21:55', NULL),
(13, NULL, 'a@gmail.com', '$2y$10$6HwCnG0Uv/Ju.iHSGKl1HOVPqDcL1aRc4.scqEy1KQ9L.cE8CqnXm', 'anik', '01623428284', 'delivery_staff', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-13 23:04:07', '2026-05-13 23:04:07', NULL),
(14, NULL, 'rayhan@gmail.com', '$2y$10$ezmbnMjVKFlfkycYfHp2feahIfCfYeTN63feRrOY39UnmZUpH73ZS', 'Kanik Deb', '01790719846', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-15 05:21:59', '2026-05-21 09:13:11', NULL),
(15, NULL, 'kanikdoc@gmail.com', '$2y$10$AiH93dd79t2yY9Gp1O459ujiI4KDXYRC/k2H3iAR5j0sgSfwoHKMS', 'kanik', '01736234238', 'doctor', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-15 05:22:53', '2026-05-15 05:22:53', NULL),
(16, NULL, 'kaniklab@gmail.com', '$2y$10$zuoC3onV9etGgBp8QnfxoONQ78I.tP7Xm1/HoKz/V04h7xUXOljsK', 'kanik', '0187356483', 'lab_technician', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-15 05:23:35', '2026-05-15 05:23:35', NULL),
(17, NULL, 'kanikdel@gmail.com', '$2y$10$024IZvPl7CVOhESjeSOnremNj8uCDuIDblwmKjt7QM86mxrwjA0V2', 'kanik', '016299786756', 'delivery_staff', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-15 05:24:35', '2026-05-15 05:24:35', NULL),
(18, NULL, 'kanikdoctor@gmail.com', '$2y$10$NtdeMe0CklnrJPDaveVREuZARVgZIs9N7q.5CfWXOaiLMyeCXWtnO', 'kanik', '01629926257', 'doctor', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-20 03:22:22', '2026-05-21 11:29:25', NULL),
(19, NULL, 'rk3712309@gmail.com', '$2y$10$QKsyEUR1R0LXaSuaWpSaDuuLc5fWE2YdgjCQ45yQhESdEiDOSlpgm', 'R Khan', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-22 08:06:35', '2026-06-06 17:33:25', NULL),
(20, NULL, 'sourav@gmail.com', '$2y$10$JlHxBkzZz9szrLyFa6xU/uUXMs4mKDxb1Y.Jafpl8XeE5iYtOx93K', 'Sourav Das', '01857682285', 'delivery_staff', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-22 10:46:29', '2026-05-22 10:46:29', NULL),
(23, NULL, 'kanikdeb95@gmail.com', '$2y$10$U3QGcIRz/nJUwAbiUfVHs.eZh7PgqFH7nfQ7Yt3KvgqRZGgsuH9rG', 'Kanik Deb', '01629926257', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-23 14:13:00', '2026-06-13 13:19:40', NULL),
(24, NULL, 'mrayhan2420446@bscse.uiu.ac.bd', '$2y$10$tcDK2A1YOW7Dy3/kOxiqB.7b7Mgm4KkMS7FM6FJxe39l0agv7QuOi', 'md rayhan', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-06-07 10:33:22', '2026-06-07 10:33:22', NULL),
(25, NULL, 'rayhankhan9603@gmail.com', '$2y$10$xb52uHzWKfK3M6lWmMcQ.O.DMNiJn5bk8kxF5AouaYMcOoiOCV6iS', 'King Rayhan Khan', '01857682285', 'doctor', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-06-07 10:36:45', '2026-06-07 10:57:37', NULL),
(26, NULL, 'kanikdeb922@gmail.com', '$2y$10$yo0My6wZMloQZcQJyMA0t.tfrNpTJB20AjNtxLQD4sHA3gO/QeQ1O', 'Kanik Deb', '+8801629926257', 'donor_recipient', NULL, 'web', 1, NULL, NULL, NULL, NULL, NULL, '2026-06-10 10:07:51', '2026-06-10 10:14:53', NULL),
(27, NULL, 'anik322@gmail.com', '$2y$10$pZ1Hqay/5zKm4KVR50khW.hUwZdJ3B7EgRxvgKYqWoQef1ZQ3GCNS', 'Anik Deb', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, 'e87c5128d9780260d80fcfaa3c3cc33fb7d027750ec56473756d16915b8d9dca', '2026-06-12 14:34:46', NULL, '2026-06-11 12:34:46', '2026-06-13 09:01:16', NULL),
(28, NULL, 'dsdigonto500@gmail.com', '$2y$10$KG3BI0bRl7AsVFat.9gGouOLj8gmc4ZHtEzrE/.rBbw/5t1RsRIhK', 'Digonto Shaha', '01857682285', 'donor_recipient', NULL, 'web', 1, NULL, NULL, '492253c19f1ba191262fe270b9d2f6051e575825ca43544761bf8fed453fb43b', '2026-06-12 14:36:49', NULL, '2026-06-11 12:36:49', '2026-06-11 12:38:37', NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_available_stock`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_available_stock`;
CREATE TABLE `vw_available_stock` (
`blood_bank_id` int(11)
,`bank_name` varchar(200)
,`blood_group` varchar(5)
,`units_available` bigint(21)
,`total_volume_ml` decimal(32,0)
,`nearest_expiry` date
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_expiring_soon`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_expiring_soon`;
CREATE TABLE `vw_expiring_soon` (
`id` int(11)
,`bag_barcode` varchar(100)
,`blood_group` varchar(5)
,`blood_bank_id` int(11)
,`bank_name` varchar(200)
,`expiry_date` date
,`days_until_expiry` int(7)
,`storage_location` varchar(100)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_temperature_alert_summary`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_temperature_alert_summary`;
CREATE TABLE `vw_temperature_alert_summary` (
`blood_bank_id` int(11)
,`bank_name` varchar(200)
,`sensor_id` varchar(100)
,`unit_name` varchar(100)
,`temperature_celsius` decimal(5,2)
,`recorded_at` timestamp
,`alert_type` varchar(6)
,`deviation` decimal(6,2)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_available_stock`
--
DROP TABLE IF EXISTS `vw_available_stock`;

DROP VIEW IF EXISTS `vw_available_stock`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_available_stock`  AS SELECT `bb`.`blood_bank_id` AS `blood_bank_id`, `b`.`name` AS `bank_name`, `bb`.`blood_group` AS `blood_group`, count(0) AS `units_available`, sum(`bb`.`volume_ml`) AS `total_volume_ml`, min(`bb`.`expiry_date`) AS `nearest_expiry` FROM (`blood_bag` `bb` join `blood_bank` `b` on(`bb`.`blood_bank_id` = `b`.`id`)) WHERE `bb`.`status` = 'available' AND `bb`.`culture_test_status` <> 'failed' AND `bb`.`expiry_date` >= curdate() GROUP BY `bb`.`blood_bank_id`, `bb`.`blood_group` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_expiring_soon`
--
DROP TABLE IF EXISTS `vw_expiring_soon`;

DROP VIEW IF EXISTS `vw_expiring_soon`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_expiring_soon`  AS SELECT `bb`.`id` AS `id`, `bb`.`bag_barcode` AS `bag_barcode`, `bb`.`blood_group` AS `blood_group`, `bb`.`blood_bank_id` AS `blood_bank_id`, `b`.`name` AS `bank_name`, `bb`.`expiry_date` AS `expiry_date`, to_days(`bb`.`expiry_date`) - to_days(curdate()) AS `days_until_expiry`, `bb`.`storage_location` AS `storage_location` FROM (`blood_bag` `bb` join `blood_bank` `b` on(`bb`.`blood_bank_id` = `b`.`id`)) WHERE `bb`.`status` = 'available' AND `bb`.`expiry_date` between curdate() and curdate() + interval 7 day ORDER BY `bb`.`expiry_date` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_temperature_alert_summary`
--
DROP TABLE IF EXISTS `vw_temperature_alert_summary`;

DROP VIEW IF EXISTS `vw_temperature_alert_summary`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_temperature_alert_summary`  AS SELECT `tl`.`blood_bank_id` AS `blood_bank_id`, `b`.`name` AS `bank_name`, `tl`.`sensor_id` AS `sensor_id`, `su`.`unit_name` AS `unit_name`, `tl`.`temperature_celsius` AS `temperature_celsius`, `tl`.`recorded_at` AS `recorded_at`, CASE WHEN `tl`.`temperature_celsius` > `su`.`max_temp` THEN 'HIGH' WHEN `tl`.`temperature_celsius` < `su`.`min_temp` THEN 'LOW' ELSE 'NORMAL' END AS `alert_type`, CASE WHEN `tl`.`temperature_celsius` > `su`.`max_temp` THEN `tl`.`temperature_celsius`- `su`.`max_temp` WHEN `tl`.`temperature_celsius` < `su`.`min_temp` THEN `su`.`min_temp`- `tl`.`temperature_celsius` ELSE 0 END AS `deviation` FROM ((`temperature_log` `tl` join `storage_unit` `su` on(`tl`.`sensor_id` = `su`.`sensor_id`)) join `blood_bank` `b` on(`tl`.`blood_bank_id` = `b`.`id`)) WHERE `tl`.`recorded_at` >= current_timestamp() - interval 24 hour ORDER BY `tl`.`recorded_at` DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `address`
--
ALTER TABLE `address`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_warning`
--
ALTER TABLE `admin_warning`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `target_type_target_id` (`target_type`,`target_id`),
  ADD KEY `suspicious_activity_log_id` (`suspicious_activity_log_id`);

--
-- Indexes for table `ai_model`
--
ALTER TABLE `ai_model`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blood_bank_id` (`blood_bank_id`),
  ADD KEY `trained_by_user_id` (`trained_by_user_id`);

--
-- Indexes for table `ai_prediction_log`
--
ALTER TABLE `ai_prediction_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `blood_bank_id` (`blood_bank_id`),
  ADD KEY `request_id` (`request_id`);

--
-- Indexes for table `antibody_match_suggestion`
--
ALTER TABLE `antibody_match_suggestion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipient_user_id` (`recipient_user_id`),
  ADD KEY `suggested_donor_user_id` (`suggested_donor_user_id`),
  ADD KEY `model_id` (`model_id`);

--
-- Indexes for table `antibody_profile`
--
ALTER TABLE `antibody_profile`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `approval_rule`
--
ALTER TABLE `approval_rule`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blood_bank_id` (`blood_bank_id`);

--
-- Indexes for table `approval_step`
--
ALTER TABLE `approval_step`
  ADD PRIMARY KEY (`id`),
  ADD KEY `approver_user_id` (`approver_user_id`);

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bank_review`
--
ALTER TABLE `bank_review`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blood_bank_id` (`blood_bank_id`),
  ADD KEY `reviewer_user_id` (`reviewer_user_id`);

--
-- Indexes for table `blood_bag`
--
ALTER TABLE `blood_bag`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bag_barcode` (`bag_barcode`),
  ADD KEY `blood_bank_id` (`blood_bank_id`),
  ADD KEY `donation_id` (`donation_id`),
  ADD KEY `idx_expiry_date` (`expiry_date`),
  ADD KEY `idx_donation_link` (`donation_id`),
  ADD KEY `idx_inventory_lookup` (`blood_bank_id`,`blood_group`,`status`,`culture_test_status`,`expiry_date`),
  ADD KEY `idx_expiry_status` (`expiry_date`,`status`);

--
-- Indexes for table `blood_bank`
--
ALTER TABLE `blood_bank`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `registration_no` (`registration_no`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `blood_culture_test`
--
ALTER TABLE `blood_culture_test`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blood_bag_id` (`blood_bag_id`),
  ADD KEY `lab_technician_id` (`lab_technician_id`);

--
-- Indexes for table `blood_request`
--
ALTER TABLE `blood_request`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_hash` (`request_hash`),
  ADD UNIQUE KEY `idx_request_hash` (`request_hash`),
  ADD KEY `blood_bank_id` (`blood_bank_id`),
  ADD KEY `requester_user_id` (`requester_user_id`),
  ADD KEY `hospital_id` (`hospital_id`),
  ADD KEY `idx_hash_lookup` (`request_hash`);

--
-- Indexes for table `chat_log`
--
ALTER TABLE `chat_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `idx_chat_session` (`user_id`,`session_id`,`created_at`);

--
-- Indexes for table `crossmatch_test`
--
ALTER TABLE `crossmatch_test`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `delivery_staff`
--
ALTER TABLE `delivery_staff`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `demand_forecast`
--
ALTER TABLE `demand_forecast`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `doctor`
--
ALTER TABLE `doctor`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `donation`
--
ALTER TABLE `donation`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `donation_promise`
--
ALTER TABLE `donation_promise`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `confirmation_code` (`confirmation_code`),
  ADD KEY `donor_user_id` (`donor_user_id`),
  ADD KEY `blood_bank_id` (`blood_bank_id`);

--
-- Indexes for table `donor_escort_request`
--
ALTER TABLE `donor_escort_request`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `donor_health_record`
--
ALTER TABLE `donor_health_record`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `donor_recipient`
--
ALTER TABLE `donor_recipient`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `donor_rewards`
--
ALTER TABLE `donor_rewards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_milestone` (`donor_user_id`,`milestone`),
  ADD KEY `donor_user_id` (`donor_user_id`);

--
-- Indexes for table `drone`
--
ALTER TABLE `drone`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `drone_dispatch`
--
ALTER TABLE `drone_dispatch`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `emergency_broadcast`
--
ALTER TABLE `emergency_broadcast`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `emergency_request`
--
ALTER TABLE `emergency_request`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `expiry_alert`
--
ALTER TABLE `expiry_alert`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `family_legacy`
--
ALTER TABLE `family_legacy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `hospital`
--
ALTER TABLE `hospital`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `international_rotation`
--
ALTER TABLE `international_rotation`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lab_technician`
--
ALTER TABLE `lab_technician`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `medical_college`
--
ALTER TABLE `medical_college`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `mental_health_flag`
--
ALTER TABLE `mental_health_flag`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification_template`
--
ALTER TABLE `notification_template`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `partner_links`
--
ALTER TABLE `partner_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pair` (`user_id_1`,`user_id_2`),
  ADD KEY `user_id_2` (`user_id_2`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `patient_registry`
--
ALTER TABLE `patient_registry`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pay_request` (`request_id`),
  ADD KEY `idx_pay_payer` (`payer_user_id`),
  ADD KEY `idx_pay_payee_user` (`payee_user_id`),
  ADD KEY `idx_pay_payee_bank` (`payee_bank_id`),
  ADD KEY `idx_pay_status` (`status`),
  ADD KEY `idx_pay_transaction` (`transaction_id`);

--
-- Indexes for table `payment_config`
--
ALTER TABLE `payment_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_config_key` (`config_key`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tran_id` (`tran_id`),
  ADD KEY `idx_tran_id` (`tran_id`),
  ADD KEY `idx_request_id` (`request_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `pregnancy_record`
--
ALTER TABLE `pregnancy_record`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `remember_tokens`
--
ALTER TABLE `remember_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `request_timeline`
--
ALTER TABLE `request_timeline`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `storage_unit`
--
ALTER TABLE `storage_unit`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suspicious_activity_log`
--
ALTER TABLE `suspicious_activity_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `temperature_log`
--
ALTER TABLE `temperature_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `thalassemia_carrier`
--
ALTER TABLE `thalassemia_carrier`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `thalassemia_couple_alert`
--
ALTER TABLE `thalassemia_couple_alert`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_couple` (`user_id_1`,`user_id_2`);

--
-- Indexes for table `transfusion`
--
ALTER TABLE `transfusion`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_warning`
--
ALTER TABLE `admin_warning`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `approval_step`
--
ALTER TABLE `approval_step`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `bank_review`
--
ALTER TABLE `bank_review`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `blood_bag`
--
ALTER TABLE `blood_bag`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

--
-- AUTO_INCREMENT for table `blood_culture_test`
--
ALTER TABLE `blood_culture_test`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `blood_request`
--
ALTER TABLE `blood_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `chat_log`
--
ALTER TABLE `chat_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `crossmatch_test`
--
ALTER TABLE `crossmatch_test`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `demand_forecast`
--
ALTER TABLE `demand_forecast`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `donation`
--
ALTER TABLE `donation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `donation_promise`
--
ALTER TABLE `donation_promise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `donor_escort_request`
--
ALTER TABLE `donor_escort_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `donor_health_record`
--
ALTER TABLE `donor_health_record`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `donor_rewards`
--
ALTER TABLE `donor_rewards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `drone`
--
ALTER TABLE `drone`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `drone_dispatch`
--
ALTER TABLE `drone_dispatch`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `emergency_broadcast`
--
ALTER TABLE `emergency_broadcast`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `emergency_request`
--
ALTER TABLE `emergency_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `expiry_alert`
--
ALTER TABLE `expiry_alert`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `family_legacy`
--
ALTER TABLE `family_legacy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `hospital`
--
ALTER TABLE `hospital`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `international_rotation`
--
ALTER TABLE `international_rotation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `medical_college`
--
ALTER TABLE `medical_college`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `mental_health_flag`
--
ALTER TABLE `mental_health_flag`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=702;

--
-- AUTO_INCREMENT for table `notification_template`
--
ALTER TABLE `notification_template`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `partner_links`
--
ALTER TABLE `partner_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `patient_registry`
--
ALTER TABLE `patient_registry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_config`
--
ALTER TABLE `payment_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `pregnancy_record`
--
ALTER TABLE `pregnancy_record`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remember_tokens`
--
ALTER TABLE `remember_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `request_timeline`
--
ALTER TABLE `request_timeline`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=160;

--
-- AUTO_INCREMENT for table `storage_unit`
--
ALTER TABLE `storage_unit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `suspicious_activity_log`
--
ALTER TABLE `suspicious_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `temperature_log`
--
ALTER TABLE `temperature_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `thalassemia_carrier`
--
ALTER TABLE `thalassemia_carrier`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `thalassemia_couple_alert`
--
ALTER TABLE `thalassemia_couple_alert`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `transfusion`
--
ALTER TABLE `transfusion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `partner_links`
--
ALTER TABLE `partner_links`
  ADD CONSTRAINT `partner_links_ibfk_1` FOREIGN KEY (`user_id_1`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `partner_links_ibfk_2` FOREIGN KEY (`user_id_2`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

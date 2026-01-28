-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 29, 2025 at 03:57 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hr_store_inventory`
--

-- --------------------------------------------------------

--
-- Table structure for table `boxes`
--

CREATE TABLE `boxes` (
  `box_id` int(11) NOT NULL,
  `box_code` varchar(100) NOT NULL,
  `year_code` varchar(10) DEFAULT NULL,
  `qr_code` varchar(100) NOT NULL,
  `supplier` varchar(200) DEFAULT NULL,
  `po_number` varchar(100) DEFAULT NULL,
  `do_number` varchar(100) DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `location_in_store` varchar(200) DEFAULT NULL,
  `status` enum('pending_checkin','checked_in','in_use','empty','damaged','returned') DEFAULT NULL,
  `received_date` date NOT NULL,
  `checked_in_date` timestamp NULL DEFAULT NULL,
  `received_by` varchar(100) NOT NULL,
  `checked_in_at` timestamp NULL DEFAULT NULL,
  `checked_in_by` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `boxes`
--

INSERT INTO `boxes` (`box_id`, `box_code`, `year_code`, `qr_code`, `supplier`, `po_number`, `do_number`, `invoice_number`, `store_id`, `location_in_store`, `status`, `received_date`, `checked_in_date`, `received_by`, `checked_in_at`, `checked_in_by`, `notes`, `created_at`, `updated_at`, `created_by`) VALUES
(21, 'BOX-2025-0001', NULL, 'BOX-2025-0001', 'test1', 'tes1', 'tes1', '', 2, '', 'checked_in', '2025-12-19', NULL, 'admin', '2025-12-19 01:39:53', 'admin', '', '2025-12-19 01:39:17', '2025-12-19 10:40:07', NULL),
(22, 'BOX-2025-0002', NULL, 'BOX-2025-0002', 'test2', 'test2', 'test2', '', 1, '', 'checked_in', '2025-12-19', NULL, 'admin', '2025-12-19 01:42:18', 'admin', '', '2025-12-19 01:39:49', '2025-12-19 01:42:18', NULL),
(23, 'BOX-2025-0003', NULL, 'BOX-2025-0003', 'test 2', '', '', '', 1, '', 'checked_in', '2025-12-19', NULL, 'admin', '2025-12-19 02:11:00', 'admin', '', '2025-12-19 02:10:54', '2025-12-19 02:11:00', NULL),
(24, 'BOX-2025-0004', NULL, 'BOX-2025-0004', 'tesatdark', '', '', '', 2, '', '', '2025-12-19', NULL, 'admin', '2025-12-19 10:27:35', 'admin', '', '2025-12-19 10:25:54', '2025-12-19 10:28:22', NULL),
(25, 'BOX-2025-0005', NULL, 'BOX-2025-0005', '', '', '', '', 1, '', 'checked_in', '2025-12-19', NULL, 'admin', '2025-12-19 14:04:06', 'admin', '', '2025-12-19 10:56:54', '2025-12-19 14:04:06', NULL),
(26, 'BOX-2025-0006', NULL, 'BOX-2025-0006', 'test2', 'test3', 'test4', '', 2, '', 'checked_in', '2025-12-20', NULL, 'admin', '2025-12-21 07:40:28', 'admin', '', '2025-12-20 09:14:40', '2025-12-21 07:40:28', NULL),
(27, 'BOX-2025-0007', NULL, 'BOX-2025-0007', 'test2', 'tewstst', 'test', '', NULL, NULL, 'pending_checkin', '2025-12-21', NULL, 'admin', NULL, NULL, '', '2025-12-21 07:40:17', '2025-12-21 07:40:17', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `box_contents`
--

CREATE TABLE `box_contents` (
  `content_id` int(11) NOT NULL,
  `box_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `remaining` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `box_contents`
--

INSERT INTO `box_contents` (`content_id`, `box_id`, `item_id`, `quantity`, `remaining`, `notes`, `created_at`, `updated_at`) VALUES
(56, 21, 22, 20, 20, NULL, '2025-12-19 01:39:17', '2025-12-19 01:39:17'),
(57, 21, 21, 20, 20, NULL, '2025-12-19 01:39:17', '2025-12-19 01:39:17'),
(58, 21, 23, 50, 50, NULL, '2025-12-19 01:39:17', '2025-12-19 01:39:17'),
(59, 22, 12, 150, 150, NULL, '2025-12-19 01:39:49', '2025-12-19 01:39:49'),
(60, 22, 13, 100, 100, NULL, '2025-12-19 01:39:49', '2025-12-19 01:39:49'),
(61, 22, 27, 70, 70, NULL, '2025-12-19 01:39:49', '2025-12-19 01:39:49'),
(62, 23, 21, 70, 70, NULL, '2025-12-19 02:10:54', '2025-12-19 02:10:54'),
(63, 23, 22, 80, 80, NULL, '2025-12-19 02:10:54', '2025-12-19 02:10:54'),
(64, 23, 23, 90, 90, NULL, '2025-12-19 02:10:54', '2025-12-19 02:10:54'),
(65, 24, 30, 30, 30, NULL, '2025-12-19 10:25:54', '2025-12-19 10:25:54'),
(66, 24, 31, 50, 50, NULL, '2025-12-19 10:25:54', '2025-12-19 10:25:54'),
(67, 24, 32, 40, 40, NULL, '2025-12-19 10:25:54', '2025-12-19 10:25:54'),
(68, 25, 33, 10, 10, NULL, '2025-12-19 10:56:54', '2025-12-19 10:56:54'),
(69, 25, 34, 10, 10, NULL, '2025-12-19 10:56:54', '2025-12-19 10:56:54'),
(70, 25, 35, 10, 10, NULL, '2025-12-19 10:56:54', '2025-12-19 10:56:54'),
(71, 25, 36, 10, 10, NULL, '2025-12-19 10:56:54', '2025-12-19 10:56:54'),
(72, 26, 37, 100, 100, NULL, '2025-12-20 09:14:40', '2025-12-20 09:14:40'),
(73, 27, 38, 100, 100, NULL, '2025-12-21 07:40:17', '2025-12-21 07:40:17');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT NULL,
  `display_order` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `description`, `icon`, `color`, `status`, `display_order`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 'Smock', 'Employee uniforms and work attire', 'shirt', '#3b82f6', 'active', 1, '2025-12-14 13:46:44', '2025-12-14 13:48:29', NULL, 'admin'),
(2, 'Safety Equipment', 'Personal protective equipment (PPE)', 'shield-check', '#10b981', 'active', 2, '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL),
(3, 'Office Supplies', 'General office stationery and supplies', 'clipboard-list', '#8b5cf6', 'active', 3, '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL),
(4, 'Event Materials', 'Items for company events and activities', 'calendar-event', '#f59e0b', 'active', 4, '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL),
(5, 'Tools & Equipment', 'Work tools and equipment', 'tools', '#6366f1', 'active', 5, '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `box_id` int(11) DEFAULT NULL,
  `box_reference` varchar(50) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reserved_quantity` int(11) DEFAULT NULL,
  `available_quantity` int(11) GENERATED ALWAYS AS (`quantity` - `reserved_quantity`) VIRTUAL,
  `min_level` int(11) DEFAULT NULL,
  `max_level` int(11) DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(100) DEFAULT NULL,
  `location_in_store` varchar(200) DEFAULT NULL,
  `last_counted_at` timestamp NULL DEFAULT NULL,
  `last_counted_by` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`inventory_id`, `store_id`, `box_id`, `box_reference`, `item_id`, `quantity`, `reserved_quantity`, `min_level`, `max_level`, `last_updated`, `updated_by`, `location_in_store`, `last_counted_at`, `last_counted_by`, `notes`, `created_at`, `updated_at`) VALUES
(134, 1, NULL, NULL, 22, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:39:53', '2025-12-19 10:40:07'),
(135, 1, NULL, NULL, 21, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:39:53', '2025-12-19 10:40:07'),
(136, 1, NULL, NULL, 23, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:39:53', '2025-12-19 10:40:07'),
(137, 1, NULL, NULL, 12, 150, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:42:18', '2025-12-19 01:42:18'),
(138, 1, NULL, NULL, 13, 100, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:42:18', '2025-12-19 01:42:18'),
(139, 1, NULL, NULL, 27, 70, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 01:42:18', '2025-12-19 01:42:18'),
(140, 1, NULL, NULL, 21, 70, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 02:11:00', '2025-12-19 02:11:00'),
(141, 1, NULL, NULL, 22, 80, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 02:11:00', '2025-12-19 02:11:00'),
(142, 1, NULL, NULL, 23, 90, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 02:11:00', '2025-12-19 02:11:00'),
(143, 2, NULL, NULL, 30, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:27:35', '2025-12-19 10:28:22'),
(144, 2, NULL, NULL, 31, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:27:35', '2025-12-19 10:28:22'),
(145, 2, NULL, NULL, 32, 0, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:27:35', '2025-12-19 10:28:22'),
(146, 2, NULL, NULL, 21, 20, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:40:07', '2025-12-19 10:40:07'),
(147, 2, NULL, NULL, 23, 50, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:40:07', '2025-12-19 10:40:07'),
(148, 2, NULL, NULL, 22, 20, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 10:40:07', '2025-12-19 10:40:07'),
(149, 1, NULL, NULL, 33, 10, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 14:04:06', '2025-12-19 14:04:06'),
(150, 1, NULL, NULL, 34, 10, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 14:04:07', '2025-12-19 14:04:07'),
(151, 1, NULL, NULL, 35, 10, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 14:04:07', '2025-12-19 14:04:07'),
(152, 1, NULL, NULL, 36, 10, 0, 50, 1000, '2025-12-20 08:02:56', NULL, NULL, NULL, NULL, NULL, '2025-12-19 14:04:07', '2025-12-19 14:04:07'),
(153, 2, NULL, NULL, 37, 100, 0, 50, 1000, '2025-12-21 07:40:28', NULL, NULL, NULL, NULL, NULL, '2025-12-21 07:40:28', '2025-12-21 07:40:28');

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `item_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `category_name` varchar(100) DEFAULT NULL,
  `type_name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `has_size` tinyint(1) DEFAULT 1,
  `has_color` tinyint(1) DEFAULT 0,
  `min_level` int(11) DEFAULT 10,
  `max_level` int(11) DEFAULT 1000,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `size` varchar(20) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `unit_type` enum('pcs','box','pack','set') DEFAULT NULL,
  `qr_code` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `min_stock` int(11) DEFAULT NULL,
  `max_stock` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`item_id`, `batch_id`, `item_code`, `item_name`, `category_name`, `type_name`, `description`, `has_size`, `has_color`, `min_level`, `max_level`, `unit_price`, `size`, `color`, `unit_type`, `qr_code`, `barcode`, `min_stock`, `max_stock`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 1, 'SM-26-XS-001', 'Smock 2026 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'SM-26-XS-001', NULL, 50, 1000, 'active', '2025-12-14 14:04:29', '2025-12-14 14:04:29', 'admin'),
(2, 2, 'WS-28-S-001', 'White Smock 3xl 2028 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'WS-28-S-001', NULL, 50, 1000, 'active', '2025-12-15 01:41:25', '2025-12-15 01:41:25', 'admin'),
(3, 2, 'WS-28-XS-001', 'White Smock 3xl 2028 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'WS-28-XS-001', NULL, 50, 1000, 'active', '2025-12-15 01:46:05', '2025-12-15 01:46:05', 'admin'),
(4, 3, 'BS-30-XS-001', 'Blue Smock White Collar 2030 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-30-XS-001', NULL, 50, 1000, 'active', '2025-12-15 01:57:03', '2025-12-15 01:57:03', 'admin'),
(5, 3, 'BS-30-S-001', 'Blue Smock White Collar 2030 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-30-S-001', NULL, 50, 1000, 'active', '2025-12-15 01:57:03', '2025-12-15 01:57:03', 'admin'),
(6, 3, 'BS-30-M-001', 'Blue Smock White Collar 2030 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-30-M-001', NULL, 50, 1000, 'active', '2025-12-15 01:57:03', '2025-12-15 01:57:03', 'admin'),
(7, 3, 'BS-30-L-001', 'Blue Smock White Collar 2030 - Size L', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'L', NULL, 'pcs', 'BS-30-L-001', NULL, 50, 1000, 'active', '2025-12-15 02:09:27', '2025-12-15 02:09:27', 'admin'),
(8, 4, 'BS-26-XS-001', 'Blue Smock White Collar 2026 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-26-XS-001', NULL, 50, 1000, 'active', '2025-12-15 08:16:05', '2025-12-15 08:16:05', 'admin'),
(9, 4, 'BS-26-S-001', 'Blue Smock White Collar 2026 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-26-S-001', NULL, 50, 1000, 'active', '2025-12-15 08:16:05', '2025-12-15 08:16:05', 'admin'),
(10, 4, 'BS-26-M-001', 'Blue Smock White Collar 2026 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-26-M-001', NULL, 50, 1000, 'active', '2025-12-15 08:16:05', '2025-12-15 08:16:05', 'admin'),
(11, 4, 'BS-26-L-001', 'Blue Smock White Collar 2026 - Size L', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'L', NULL, 'pcs', 'BS-26-L-001', NULL, 50, 1000, 'active', '2025-12-15 08:16:05', '2025-12-15 08:16:05', 'admin'),
(12, 5, 'BS-27-XS-001', 'Blue Smock White Collar 2027 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-27-XS-001', NULL, 50, 1000, 'active', '2025-12-15 08:20:00', '2025-12-15 08:20:00', 'admin'),
(13, 5, 'BS-27-S-001', 'Blue Smock White Collar 2027 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-27-S-001', NULL, 50, 1000, 'active', '2025-12-15 08:20:00', '2025-12-15 08:20:00', 'admin'),
(14, 6, 'BS-31-S-001', 'Blue Smock White Collar 2031 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-31-S-001', NULL, 50, 1000, 'active', '2025-12-16 13:42:14', '2025-12-16 13:42:14', 'admin'),
(15, 6, 'BS-31-XS-001', 'Blue Smock White Collar 2031 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-31-XS-001', NULL, 50, 1000, 'active', '2025-12-16 13:42:14', '2025-12-16 13:42:14', 'admin'),
(16, 6, 'BS-31-M-001', 'Blue Smock White Collar 2031 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-31-M-001', NULL, 50, 1000, 'active', '2025-12-16 13:42:14', '2025-12-16 13:42:14', 'admin'),
(17, 6, 'BS-31-L-001', 'Blue Smock White Collar 2031 - Size L', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'L', NULL, 'pcs', 'BS-31-L-001', NULL, 50, 1000, 'active', '2025-12-16 13:42:14', '2025-12-16 13:42:14', 'admin'),
(18, 7, 'BS-29-S-001', 'Blue Smock White Collar 2029 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-29-S-001', NULL, 50, 1000, 'active', '2025-12-16 13:44:31', '2025-12-16 13:44:31', 'admin'),
(19, 7, 'BS-29-M-001', 'Blue Smock White Collar 2029 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-29-M-001', NULL, 50, 1000, 'active', '2025-12-16 13:44:31', '2025-12-16 13:44:31', 'admin'),
(20, 7, 'BS-29-XS-001', 'Blue Smock White Collar 2029 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-29-XS-001', NULL, 50, 1000, 'active', '2025-12-16 13:44:31', '2025-12-16 13:44:31', 'admin'),
(21, 8, 'BS-25-S-001', 'Blue Smock White Collar 2025 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'BS-25-S-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:25', '2025-12-16 14:29:25', 'admin'),
(22, 8, 'BS-25-XS-001', 'Blue Smock White Collar 2025 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'BS-25-XS-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:25', '2025-12-16 14:29:25', 'admin'),
(23, 8, 'BS-25-M-001', 'Blue Smock White Collar 2025 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-25-M-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:25', '2025-12-16 14:29:25', 'admin'),
(24, 4, 'BS-26-XL-001', 'Blue Smock White Collar 2026 - Size XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XL', NULL, 'pcs', 'BS-26-XL-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:52', '2025-12-16 14:29:52', 'admin'),
(25, 4, 'BS-26-XXL-001', 'Blue Smock White Collar 2026 - Size XXL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XXL', NULL, 'pcs', 'BS-26-XXL-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:52', '2025-12-16 14:29:52', 'admin'),
(26, 4, 'BS-26-3XL-001', 'Blue Smock White Collar 2026 - Size 3XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '3XL', NULL, 'pcs', 'BS-26-3XL-001', NULL, 50, 1000, 'active', '2025-12-16 14:29:52', '2025-12-16 14:29:52', 'admin'),
(27, 5, 'BS-27-M-001', 'Blue Smock White Collar 2027 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'BS-27-M-001', NULL, 50, 1000, 'active', '2025-12-18 01:04:02', '2025-12-18 01:04:02', 'admin'),
(28, 5, 'BS-27-L-001', 'Blue Smock White Collar 2027 - Size L', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'L', NULL, 'pcs', 'BS-27-L-001', NULL, 50, 1000, 'active', '2025-12-18 05:55:14', '2025-12-18 05:55:14', 'admin'),
(29, 9, 'SA-25-38UK-001', 'SafeBoots 2025 - Size 38UK', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '38UK', NULL, 'pcs', 'SA-25-38UK-001', NULL, 50, 1000, 'active', '2025-12-19 01:21:14', '2025-12-19 01:21:14', 'admin'),
(30, 10, 'DG-27-M-001', 'Dark Green Smock 2027 - Size M', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'M', NULL, 'pcs', 'DG-27-M-001', NULL, 50, 1000, 'active', '2025-12-19 10:25:54', '2025-12-19 10:25:54', 'admin'),
(31, 10, 'DG-27-S-001', 'Dark Green Smock 2027 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'DG-27-S-001', NULL, 50, 1000, 'active', '2025-12-19 10:25:54', '2025-12-19 10:25:54', 'admin'),
(32, 10, 'DG-27-XS-001', 'Dark Green Smock 2027 - Size XS', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'XS', NULL, 'pcs', 'DG-27-XS-001', NULL, 50, 1000, 'active', '2025-12-19 10:25:54', '2025-12-19 10:25:54', 'admin'),
(33, 11, 'DG-28-5XL-001', 'Dark Green Smock 2028 - Size 5XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '5XL', NULL, 'pcs', 'DG-28-5XL-001', NULL, 50, 1000, 'active', '2025-12-19 10:56:54', '2025-12-19 10:56:54', 'admin'),
(34, 11, 'DG-28-6XL-001', 'Dark Green Smock 2028 - Size 6XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '6XL', NULL, 'pcs', 'DG-28-6XL-001', NULL, 50, 1000, 'active', '2025-12-19 10:56:54', '2025-12-19 10:56:54', 'admin'),
(35, 11, 'DG-28-7XL-001', 'Dark Green Smock 2028 - Size 7XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '7XL', NULL, 'pcs', 'DG-28-7XL-001', NULL, 50, 1000, 'active', '2025-12-19 10:56:54', '2025-12-19 10:56:54', 'admin'),
(36, 11, 'DG-28-8XL-001', 'Dark Green Smock 2028 - Size 8XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '8XL', NULL, 'pcs', 'DG-28-8XL-001', NULL, 50, 1000, 'active', '2025-12-19 10:56:54', '2025-12-19 10:56:54', 'admin'),
(37, 12, 'DG-25-10XL-001', 'Dark Green Smock 2025 - Size 10XL', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, '10XL', NULL, 'pcs', 'DG-25-10XL-001', NULL, 50, 1000, 'active', '2025-12-20 09:14:40', '2025-12-20 09:14:40', 'admin'),
(38, 13, 'WS-25-S-001', 'White Smock 3xl 2025 - Size S', NULL, NULL, NULL, 1, 0, 10, 1000, NULL, 'S', NULL, 'pcs', 'WS-25-S-001', NULL, 50, 1000, 'active', '2025-12-21 07:40:17', '2025-12-21 07:40:17', 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `item_batches`
--

CREATE TABLE `item_batches` (
  `batch_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `year_code` varchar(4) NOT NULL,
  `batch_name` varchar(100) DEFAULT NULL,
  `specifications` text DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `status` enum('active','discontinued','phasing_out') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_batches`
--

INSERT INTO `item_batches` (`batch_id`, `type_id`, `year_code`, `batch_name`, `specifications`, `production_date`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 1, '26', 'Smock 2026', NULL, NULL, 'active', '2025-12-14 14:04:29', '2025-12-14 14:04:29', 'admin'),
(2, 1, '28', 'White Smock 3xl 2028', NULL, NULL, 'active', '2025-12-15 01:41:25', '2025-12-15 01:41:25', 'admin'),
(3, 2, '30', 'Blue Smock White Collar 2030', NULL, NULL, 'active', '2025-12-15 01:57:03', '2025-12-15 01:57:03', 'admin'),
(4, 2, '26', 'Blue Smock White Collar 2026', NULL, NULL, 'active', '2025-12-15 08:16:05', '2025-12-15 08:16:05', 'admin'),
(5, 2, '27', 'Blue Smock White Collar 2027', NULL, NULL, 'active', '2025-12-15 08:20:00', '2025-12-15 08:20:00', 'admin'),
(6, 2, '31', 'Blue Smock White Collar 2031', NULL, NULL, 'active', '2025-12-16 13:42:14', '2025-12-16 13:42:14', 'admin'),
(7, 2, '29', 'Blue Smock White Collar 2029', NULL, NULL, 'active', '2025-12-16 13:44:31', '2025-12-16 13:44:31', 'admin'),
(8, 2, '25', 'Blue Smock White Collar 2025', NULL, NULL, 'active', '2025-12-16 14:29:25', '2025-12-16 14:29:25', 'admin'),
(9, 3, '25', 'SafeBoots 2025', NULL, NULL, 'active', '2025-12-19 01:21:14', '2025-12-19 01:21:14', 'admin'),
(10, 4, '27', 'Dark Green Smock 2027', NULL, NULL, 'active', '2025-12-19 10:25:54', '2025-12-19 10:25:54', 'admin'),
(11, 4, '28', 'Dark Green Smock 2028', NULL, NULL, 'active', '2025-12-19 10:56:54', '2025-12-19 10:56:54', 'admin'),
(12, 4, '25', 'Dark Green Smock 2025', NULL, NULL, 'active', '2025-12-20 09:14:40', '2025-12-20 09:14:40', 'admin'),
(13, 1, '25', 'White Smock 3xl 2025', NULL, NULL, 'active', '2025-12-21 07:40:17', '2025-12-21 07:40:17', 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `item_types`
--

CREATE TABLE `item_types` (
  `type_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `has_size` tinyint(1) DEFAULT NULL,
  `available_sizes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_sizes`)),
  `has_color` tinyint(1) DEFAULT NULL,
  `available_colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_colors`)),
  `status` enum('active','inactive') DEFAULT NULL,
  `display_order` int(11) DEFAULT NULL,
  `min_stock_level` int(11) DEFAULT NULL COMMENT 'Default minimum stock level per store for this item type',
  `max_stock_level` int(11) DEFAULT NULL COMMENT 'Default maximum stock level per store for this item type',
  `size_stock_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Stock levels per size: {"S": {"min": 50, "max": 1000}, "M": {"min": 30, "max": 1000}}' CHECK (json_valid(`size_stock_levels`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_types`
--

INSERT INTO `item_types` (`type_id`, `category_id`, `type_name`, `description`, `has_size`, `available_sizes`, `has_color`, `available_colors`, `status`, `display_order`, `min_stock_level`, `max_stock_level`, `size_stock_levels`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 1, 'White Smock 3xl', '', 1, '\"[\\\"XS\\\", \\\"S\\\"]\"', 0, '[]', 'active', 0, 50, 1000, '\"{\\\"XS\\\": {\\\"min\\\": 100, \\\"max\\\": 1000}, \\\"S\\\": {\\\"min\\\": 100, \\\"max\\\": 1000}}\"', '2025-12-14 14:04:04', '2025-12-15 00:39:55', 'admin', 'admin'),
(2, 1, 'Blue Smock White Collar', '', 1, '\"[\\\"XS\\\", \\\"S\\\", \\\"M\\\", \\\"L\\\", \\\"XL\\\", \\\"XXL\\\", \\\"3XL\\\"]\"', 0, 'null', 'active', 0, 50, 1000, '\"{\\\"XS\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"S\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"M\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"L\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"XXL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"3XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}}\"', '2025-12-15 01:56:34', '2025-12-15 01:56:34', 'admin', NULL),
(3, 2, 'SafeBoots', '', 1, '\"[\\\"38UK\\\"]\"', 0, 'null', 'active', 0, 50, 1000, '\"{\\\"38UK\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}}\"', '2025-12-19 01:12:39', '2025-12-19 01:12:39', 'admin', NULL),
(4, 1, 'Dark Green Smock', '', 1, '\"[\\\"XS\\\", \\\"M\\\", \\\"S\\\", \\\"L\\\", \\\"XL\\\", \\\"XXL\\\", \\\"3XL\\\", \\\"4XL\\\", \\\"5XL\\\", \\\"6XL\\\", \\\"7XL\\\", \\\"8XL\\\", \\\"9XL\\\", \\\"10XL\\\"]\"', 0, 'null', 'active', 0, 50, 1000, '\"{\\\"XS\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"M\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"S\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"L\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"XXL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"3XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"4XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"5XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"6XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"7XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"8XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"9XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}, \\\"10XL\\\": {\\\"min\\\": 50, \\\"max\\\": 1000}}\"', '2025-12-19 10:25:30', '2025-12-19 10:25:30', 'admin', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` enum('low_stock','out_of_stock','pending_checkin','transaction','system','info','warning','error') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `status` enum('unread','read') DEFAULT NULL,
  `link` varchar(500) DEFAULT NULL,
  `notification_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notification_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `plants`
--

CREATE TABLE `plants` (
  `plant_id` int(11) NOT NULL,
  `plant_code` varchar(20) NOT NULL,
  `plant_name` varchar(100) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `plants`
--

INSERT INTO `plants` (`plant_id`, `plant_code`, `plant_name`, `location`, `address`, `city`, `state`, `postcode`, `country`, `contact_person`, `contact_number`, `email`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 'PNG01', 'Jabil Penang', 'Penang, Malaysia', NULL, NULL, NULL, NULL, 'Malaysia', NULL, NULL, NULL, 'active', '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL),
(2, 'JHR01', 'Jabil Johor', 'Johor, Malaysia', NULL, NULL, NULL, NULL, 'Malaysia', NULL, NULL, NULL, 'active', '2025-12-14 13:46:44', '2025-12-14 13:46:44', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stock_transactions`
--

CREATE TABLE `stock_transactions` (
  `transaction_id` int(11) NOT NULL,
  `transaction_type` enum('box_checkin','stock_out','transfer_out','transfer_in','adjustment','return','damage','disposal') NOT NULL,
  `box_id` int(11) DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp(),
  `item_id` int(11) NOT NULL,
  `from_store_id` int(11) DEFAULT NULL,
  `to_store_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `request_by` varchar(100) DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `store_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_transactions`
--

INSERT INTO `stock_transactions` (`transaction_id`, `transaction_type`, `box_id`, `transaction_date`, `item_id`, `from_store_id`, `to_store_id`, `quantity`, `reference_number`, `reference_type`, `request_by`, `employee_name`, `employee_id`, `department`, `reason`, `notes`, `created_by`, `created_at`, `store_id`) VALUES
(237, 'box_checkin', 21, '2025-12-20 08:48:48', 22, NULL, 1, 20, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:39:53', NULL),
(238, 'box_checkin', 21, '2025-12-20 08:48:48', 21, NULL, 1, 20, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:39:53', NULL),
(239, 'box_checkin', 21, '2025-12-20 08:48:48', 23, NULL, 1, 50, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:39:53', NULL),
(240, 'box_checkin', 22, '2025-12-20 08:48:48', 12, NULL, 1, 150, 'BOX-2025-0002', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:42:18', NULL),
(241, 'box_checkin', 22, '2025-12-20 08:48:48', 13, NULL, 1, 100, 'BOX-2025-0002', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:42:18', NULL),
(242, 'box_checkin', 22, '2025-12-20 08:48:48', 27, NULL, 1, 70, 'BOX-2025-0002', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 01:42:18', NULL),
(243, 'box_checkin', 23, '2025-12-20 08:48:48', 21, NULL, 1, 70, 'BOX-2025-0003', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 02:11:00', NULL),
(244, 'box_checkin', 23, '2025-12-20 08:48:48', 22, NULL, 1, 80, 'BOX-2025-0003', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 02:11:00', NULL),
(245, 'box_checkin', 23, '2025-12-20 08:48:48', 23, NULL, 1, 90, 'BOX-2025-0003', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 02:11:00', NULL),
(246, 'box_checkin', 24, '2025-12-20 08:48:48', 30, NULL, 2, 30, 'BOX-2025-0004', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:27:35', NULL),
(247, 'box_checkin', 24, '2025-12-20 08:48:48', 31, NULL, 2, 50, 'BOX-2025-0004', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:27:35', NULL),
(248, 'box_checkin', 24, '2025-12-20 08:48:48', 32, NULL, 2, 40, 'BOX-2025-0004', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:27:35', NULL),
(249, 'stock_out', 24, '2025-12-20 08:48:48', 30, 2, NULL, 30, 'BOX-2025-0004', 'BOX', NULL, 'Quick Stock Out', 'QUICK', 'Warehouse', NULL, 'Auto stock out from scanned box BOX-2025-0004', 'admin', '2025-12-19 10:28:22', NULL),
(250, 'stock_out', 24, '2025-12-20 08:48:48', 31, 2, NULL, 50, 'BOX-2025-0004', 'BOX', NULL, 'Quick Stock Out', 'QUICK', 'Warehouse', NULL, 'Auto stock out from scanned box BOX-2025-0004', 'admin', '2025-12-19 10:28:22', NULL),
(251, 'stock_out', 24, '2025-12-20 08:48:48', 32, 2, NULL, 40, 'BOX-2025-0004', 'BOX', NULL, 'Quick Stock Out', 'QUICK', 'Warehouse', NULL, 'Auto stock out from scanned box BOX-2025-0004', 'admin', '2025-12-19 10:28:22', NULL),
(252, 'box_checkin', 21, '2025-12-20 08:48:48', 21, NULL, 2, 0, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, 'Box transferred from store 1', 'admin', '2025-12-19 10:40:07', NULL),
(253, 'transfer_out', 21, '2025-12-20 08:48:48', 21, 1, 2, 20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:40:07', NULL),
(254, 'box_checkin', 21, '2025-12-20 08:48:48', 23, NULL, 2, 0, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, 'Box transferred from store 1', 'admin', '2025-12-19 10:40:07', NULL),
(255, 'transfer_out', 21, '2025-12-20 08:48:48', 23, 1, 2, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:40:07', NULL),
(256, 'box_checkin', 21, '2025-12-20 08:48:48', 22, NULL, 2, 0, 'BOX-2025-0001', 'BOX', NULL, NULL, NULL, NULL, NULL, 'Box transferred from store 1', 'admin', '2025-12-19 10:40:07', NULL),
(257, 'transfer_out', 21, '2025-12-20 08:48:48', 22, 1, 2, 20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 10:40:07', NULL),
(258, 'box_checkin', 25, '2025-12-20 08:48:48', 33, NULL, 1, 10, 'BOX-2025-0005', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 14:04:07', NULL),
(259, 'box_checkin', 25, '2025-12-20 08:48:48', 34, NULL, 1, 10, 'BOX-2025-0005', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 14:04:07', NULL),
(260, 'box_checkin', 25, '2025-12-20 08:48:48', 35, NULL, 1, 10, 'BOX-2025-0005', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 14:04:07', NULL),
(261, 'box_checkin', 25, '2025-12-20 08:48:48', 36, NULL, 1, 10, 'BOX-2025-0005', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-19 14:04:07', NULL),
(262, 'box_checkin', 26, '2025-12-21 07:40:28', 37, NULL, 2, 100, 'BOX-2025-0006', 'BOX', NULL, NULL, NULL, NULL, NULL, NULL, 'admin', '2025-12-21 07:40:28', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stores`
--

CREATE TABLE `stores` (
  `store_id` int(11) NOT NULL,
  `plant_id` int(11) NOT NULL,
  `store_code` varchar(20) NOT NULL,
  `store_name` varchar(100) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `store_type` enum('main','sub','production','warehouse','defect','quarantine') DEFAULT NULL,
  `location_details` varchar(200) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `current_items` int(11) DEFAULT NULL,
  `store_manager` varchar(100) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','inactive','maintenance') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stores`
--

INSERT INTO `stores` (`store_id`, `plant_id`, `store_code`, `store_name`, `location`, `description`, `store_type`, `location_details`, `capacity`, `current_items`, `store_manager`, `contact_number`, `notes`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 1, 'GUNA', 'GUNEE', NULL, NULL, 'main', '', NULL, 0, '', '', '', 'active', '2025-12-14 13:47:54', '2025-12-14 13:47:54', 'admin', NULL),
(2, 1, '332', 'adzlan', NULL, NULL, 'sub', '', NULL, 0, 'Adzlan', '', '', 'active', '2025-12-15 00:41:31', '2025-12-18 02:00:05', 'admin', 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_photo` varchar(500) DEFAULT NULL,
  `role` enum('admin','worker','intern') DEFAULT 'worker',
  `status` enum('active','inactive') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `full_name`, `password_hash`, `profile_photo`, `role`, `status`, `created_at`, `last_login`) VALUES
(1, 'admin', 'admin@jabil.com', 'System Administrator', '$2b$12$04gttoo8TuZhI5zRxiFrne5u1ck9IHzpE75GH4MSqpvn.INaF/GsK', '/uploads/profiles/1_369dff0cf2f74997b8b717fdd3af152e.gif', 'admin', 'active', '2025-12-14 13:46:44', '2025-12-21 23:24:56'),
(6, 'testtt', 'nafililwan1@gmail.com', 'test', '$2b$12$mVoUE1ycPyKXJL56yyaFxeI3kgE63ZIpsqwXUeSLQxp9rA0m7mInG', NULL, 'intern', 'active', '2025-12-20 03:32:16', '2025-12-19 19:36:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `boxes`
--
ALTER TABLE `boxes`
  ADD PRIMARY KEY (`box_id`),
  ADD UNIQUE KEY `box_code` (`box_code`),
  ADD UNIQUE KEY `qr_code` (`qr_code`),
  ADD KEY `store_id` (`store_id`),
  ADD KEY `idx_year_code` (`year_code`);

--
-- Indexes for table `box_contents`
--
ALTER TABLE `box_contents`
  ADD PRIMARY KEY (`content_id`),
  ADD KEY `box_id` (`box_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `store_id` (`store_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `idx_box_id` (`box_id`),
  ADD KEY `idx_box_reference` (`box_reference`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`item_id`),
  ADD UNIQUE KEY `item_code` (`item_code`),
  ADD UNIQUE KEY `qr_code` (`qr_code`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `item_batches`
--
ALTER TABLE `item_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `type_id` (`type_id`);

--
-- Indexes for table `item_types`
--
ALTER TABLE `item_types`
  ADD PRIMARY KEY (`type_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `ix_notifications_notification_id` (`notification_id`),
  ADD KEY `ix_notifications_type` (`type`),
  ADD KEY `ix_notifications_status` (`status`),
  ADD KEY `ix_notifications_user_id` (`user_id`),
  ADD KEY `ix_notifications_created_at` (`created_at`);

--
-- Indexes for table `plants`
--
ALTER TABLE `plants`
  ADD PRIMARY KEY (`plant_id`),
  ADD UNIQUE KEY `plant_code` (`plant_code`);

--
-- Indexes for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `box_id` (`box_id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `from_store_id` (`from_store_id`),
  ADD KEY `to_store_id` (`to_store_id`),
  ADD KEY `idx_store_id` (`store_id`),
  ADD KEY `idx_transaction_date` (`transaction_date`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`store_id`),
  ADD UNIQUE KEY `store_code` (`store_code`),
  ADD KEY `plant_id` (`plant_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `ix_users_username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `ix_users_user_id` (`user_id`);

--



-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `boxes`
--
ALTER TABLE `boxes`
  MODIFY `box_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `box_contents`
--
ALTER TABLE `box_contents`
  MODIFY `content_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `item_batches`
--
ALTER TABLE `item_batches`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `item_types`
--
ALTER TABLE `item_types`
  MODIFY `type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `plants`
--
ALTER TABLE `plants`
  MODIFY `plant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=263;

--
-- AUTO_INCREMENT for table `stores`
--
ALTER TABLE `stores`
  MODIFY `store_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `boxes`
--
ALTER TABLE `boxes`
  ADD CONSTRAINT `boxes_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`);

--
-- Constraints for table `box_contents`
--
ALTER TABLE `box_contents`
  ADD CONSTRAINT `box_contents_ibfk_1` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`box_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `box_contents_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`);

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`),
  ADD CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`box_id`) ON DELETE SET NULL;

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `items_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `item_batches` (`batch_id`);

--
-- Constraints for table `item_batches`
--
ALTER TABLE `item_batches`
  ADD CONSTRAINT `item_batches_ibfk_1` FOREIGN KEY (`type_id`) REFERENCES `item_types` (`type_id`);

--
-- Constraints for table `item_types`
--
ALTER TABLE `item_types`
  ADD CONSTRAINT `item_types_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  ADD CONSTRAINT `stock_transactions_ibfk_1` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`box_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `stock_transactions_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`),
  ADD CONSTRAINT `stock_transactions_ibfk_3` FOREIGN KEY (`from_store_id`) REFERENCES `stores` (`store_id`),
  ADD CONSTRAINT `stock_transactions_ibfk_4` FOREIGN KEY (`to_store_id`) REFERENCES `stores` (`store_id`),
  ADD CONSTRAINT `stock_transactions_ibfk_5` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE;

--
-- Constraints for table `stores`
--
ALTER TABLE `stores`
  ADD CONSTRAINT `stores_ibfk_1` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;



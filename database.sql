-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th2 23, 2026 lúc 04:34 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `football_booking`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `booking_date` date NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `note` text DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `fields`
--

CREATE TABLE `fields` (
  `id` int(11) NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `district` varchar(100) NOT NULL,
  `ward` varchar(100) NOT NULL,
  `street_address` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `fields`
--

INSERT INTO `fields` (`id`, `field_name`, `province`, `district`, `ward`, `street_address`, `description`, `owner_id`, `status`, `created_at`) VALUES
(3, 'Sân bóng Tuấn Phong', 'Hà Nội', 'Thanh Xuân', 'Thanh Trì', 'Đường Phạm Tu, số 10', 'Sân chơi cho anh em đam mê bóng đá', 2, 'active', '2026-02-01 23:29:15'),
(4, 'Sân bóng Minh Đức', 'Hà Nội', 'Thanh Xuân', 'Thanh Trì', 'Đường Phạm Tu, số 12', 'Sân bóng đá chất lượng', 2, 'active', '2026-02-05 17:24:33');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `field_images`
--

CREATE TABLE `field_images` (
  `id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `field_images`
--

INSERT INTO `field_images` (`id`, `field_id`, `image_url`, `is_primary`, `created_at`) VALUES
(3, 3, '/uploads/1769963355774-sh5awcbe.jpg', 1, '2026-02-01 23:29:15'),
(4, 4, '/uploads/1770287073797-sa2hqaw9.jpg', 1, '2026-02-05 17:24:33');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `field_prices`
--

CREATE TABLE `field_prices` (
  `id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `field_prices`
--

INSERT INTO `field_prices` (`id`, `field_id`, `time_slot_id`, `price`) VALUES
(1, 3, 1, 1000000.00),
(2, 3, 2, 1000000.00),
(3, 4, 3, 1000000.00),
(4, 4, 4, 1000000.00);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `owners`
--

CREATE TABLE `owners` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `owners`
--

INSERT INTO `owners` (`id`, `user_id`, `owner_name`, `phone`, `created_at`) VALUES
(2, 7, 'Tiến Phạm', '', '2026-02-01 23:29:15');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `reviews`
--

INSERT INTO `reviews` (`id`, `customer_id`, `field_id`, `rating`, `comment`, `created_at`) VALUES
(1, 9, 3, 5, 'tệ', '2026-02-05 17:46:43'),
(6, 9, 3, 3, 'ok', '2026-02-05 17:55:35'),
(7, 9, 4, 5, 'oki', '2026-02-14 14:07:37');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `time_slots`
--

CREATE TABLE `time_slots` (
  `id` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `type` enum('normal','peak') DEFAULT 'normal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `time_slots`
--

INSERT INTO `time_slots` (`id`, `start_time`, `end_time`, `type`) VALUES
(1, '17:00:00', '18:00:00', 'peak'),
(2, '18:00:00', '19:00:00', 'peak'),
(3, '17:00:00', '18:30:00', 'peak'),
(4, '18:30:00', '20:00:00', 'peak');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `clerk_user_id` varchar(255) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('customer','owner','admin') NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `clerk_user_id`, `name`, `email`, `phone`, `role`, `created_at`) VALUES
(1, '', 'Admin', 'admin@gmail.com', NULL, 'admin', '2026-01-29 22:21:56'),
(7, 'user_394jsFqCB3KdkBbm0GpF4FQANdF', 'Tiến Phạm', 'ngoctien30804@gmail.com', NULL, 'owner', '2026-02-01 23:14:05'),
(9, 'user_394jv4J9a2pDwoVuw67rghzpHg8', 'Tiến', 'trieng02@gmail.com', NULL, 'customer', '2026-02-05 17:19:12');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `field_id` (`field_id`,`booking_date`,`time_slot_id`),
  ADD KEY `fk_booking_customer` (`customer_id`),
  ADD KEY `fk_booking_time` (`time_slot_id`);

--
-- Chỉ mục cho bảng `fields`
--
ALTER TABLE `fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_field_owner` (`owner_id`);

--
-- Chỉ mục cho bảng `field_images`
--
ALTER TABLE `field_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_image_field` (`field_id`);

--
-- Chỉ mục cho bảng `field_prices`
--
ALTER TABLE `field_prices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `field_id` (`field_id`,`time_slot_id`),
  ADD KEY `fk_price_time` (`time_slot_id`);

--
-- Chỉ mục cho bảng `owners`
--
ALTER TABLE `owners`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_review_field` (`field_id`);

--
-- Chỉ mục cho bảng `time_slots`
--
ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clerk_user_id` (`clerk_user_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `fields`
--
ALTER TABLE `fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `field_images`
--
ALTER TABLE `field_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `field_prices`
--
ALTER TABLE `field_prices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `owners`
--
ALTER TABLE `owners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `time_slots`
--
ALTER TABLE `time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_booking_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_time` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `fields`
--
ALTER TABLE `fields`
  ADD CONSTRAINT `fk_field_owner` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `field_images`
--
ALTER TABLE `field_images`
  ADD CONSTRAINT `fk_image_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `field_prices`
--
ALTER TABLE `field_prices`
  ADD CONSTRAINT `fk_price_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_price_time` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `owners`
--
ALTER TABLE `owners`
  ADD CONSTRAINT `fk_owner_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_review_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

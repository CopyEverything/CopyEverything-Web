-- phpMyAdmin SQL Dump
-- version 4.0.10deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Jan 31, 2016 at 01:07 PM
-- Server version: 5.5.47-0ubuntu0.14.04.1
-- PHP Version: 5.5.9-1ubuntu4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `copyeverything`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(256) NOT NULL,
  `passhash` varchar(256) NOT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=11 ;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`uid`, `email`, `passhash`) VALUES
(1, 'test@test.com', '$2y$10$LLiC3l5DhUm15auQaQ8e0.y85F7tZBAsY51VO3aHiFmfsHkZdFDQq'),
(2, 'test@tesft.com', '$2y$10$2qz6WCPv7QwLuhcspc1XaOGNtVLdnrGr78UDiRDMK1cqIDOrJk1mS'),
(3, 'nico@test.com', '$2y$10$w7LDrK0DF5gNEXu5sDV5K.sReWJSSwudZZte9S3l01KI7nfw3UY9m'),
(8, 'test2@test.com', '$2y$10$MyJqBuhuoLCcIgNJVQeEYeJs7yQMD5a6Fe1h89WQTGX1vcKCmZ3x6'),
(9, 'final@final.com', '$2y$10$nsfSNFlGML42U4n7uWBW6.nDvkVrcHFb6c0xbFbrFwSbbU2mr02Eq'),
(10, '5westbury5@gmail.com', '$2y$10$vf6ARgDm7W.HEAL83OUqNu56ZajxQgnLy06bp2PM0FeCfg5x2KuXK');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

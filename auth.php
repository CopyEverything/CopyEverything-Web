<?php

require("database.php");
require("firebase_secret.php");

include_once "firebase/JWT.php";
include_once "firebase/TokenException.php";
include_once "firebase/TokenGenerator.php";

use Firebase\Token\TokenException;
use Firebase\Token\TokenGenerator;

if(!isset($_POST['email']) || !isset($_POST['pass']))
	die(json_encode(array(false, "Missing email or password.")));

$email = $_POST['email'];
$pass = $_POST['pass'];

$email_escaped = $con->escape_string($email);

$res = $con->query("SELECT * FROM `users` WHERE email='$email_escaped'") or die(json_encode(array(false, $con->error)));
$row = $res->fetch_assoc();

if(!$row)
	die(json_encode(array(false, "Could not find email in database.")));

if(password_verify($pass, $row['passhash'])) {
	try {
		$generator = new TokenGenerator($firebase_secret);
		$token = $generator
			->setData(array('uid' => $row['uid']))
			->create();
	} catch (TokenException $e) {
		echo json_encode(array(false, "Error: ".$e->getMessage()));
	}

	die(json_encode(array(true, $row['uid'], $token)));
	
} else {
	die(json_encode(array(false, "Could not find a user with that email and password.")));
}
?>
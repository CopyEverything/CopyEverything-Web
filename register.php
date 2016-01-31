<?php

require("database.php");

$email = $_POST['email'];
$pass1 = $_POST['pass1'];
$pass2 = $_POST['pass2'];

function register($email, $pass1, $pass2) {
	global $con;
	
	if(!filter_var($email, FILTER_VALIDATE_EMAIL))
		return array(false, "Email is not properly formatted.");
	
	if($pass1 !== $pass2)
		return array(false, "Passwords do not match.");
	if(strlen($pass1) < 8)
		return array(false, "Password must be at least 8 characters.");
	
	$email_escaped = $con->escape_string($email);
	$passhash = password_hash ($pass1, PASSWORD_DEFAULT);
	
	$res = $con->query("SELECT * FROM `users` WHERE email='$email_escaped'") or die(json_encode(array(false, $con->error)));
	$row = $res->fetch_assoc();

	if($row)
		die(json_encode(array(false, "Email already registered.")));
	
	$con->query("INSERT INTO `users`(`email`, `passhash`) VALUES ('$email_escaped','$passhash')") or die(array(false, $con-error));
	
	return array(true, "Registered successfully with email: $email");
}

die(json_encode(register($email, $pass1, $pass2)));
?>
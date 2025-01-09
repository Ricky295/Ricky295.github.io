<?php
$json = file_get_contents('php://input');
file_put_contents('data.json', $json);
echo "Data saved successfully.";
?>

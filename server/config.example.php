<?php
/**
 * このファイルを config.php としてコピーし、トークンを差し替えてください。
 * config.php は .gitignore 済みで、Gitリポジトリにはコミットされません。
 *
 * トークンはフロント側（.env の VITE_API_TOKEN）と同じ値を設定してください。
 * openssl rand -hex 24  などで生成した値を推奨します。
 */

define("API_TOKEN", "ここに十分に長いランダムな文字列を設定してください");

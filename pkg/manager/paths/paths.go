package paths

import (
	"path/filepath"
)

func GetConfigDirectory() string {
	return "."
}

func GetDefaultDatabaseFilePath() string {
	return "postgres@localhost/stash-box?sslmode=disable"
}

func GetConfigName() string {
	return "stash-box-config"
}

func GetDefaultConfigFilePath() string {
	return filepath.Join(GetConfigDirectory(), GetConfigName()+".yml")
}

func GetSSLKey() string {
	return filepath.Join(GetConfigDirectory(), "stash-box.key")
}

func GetSSLCert() string {
	return filepath.Join(GetConfigDirectory(), "stash-box.crt")
}

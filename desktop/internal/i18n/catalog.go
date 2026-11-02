package i18n

import (
	"embed"
	"encoding/json"
)

//go:embed locales/*.json
var catalogs embed.FS

type Catalog map[string]string

func Load(locale string) Catalog {
	data, e := catalogs.ReadFile("locales/" + locale + ".json")
	if e != nil {
		data, _ = catalogs.ReadFile("locales/en.json")
	}
	result := Catalog{}
	_ = json.Unmarshal(data, &result)
	return result
}
func (t Catalog) Text(key string) string {
	if value, ok := t[key]; ok {
		return value
	}
	return key
}

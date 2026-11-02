package i18n

import (
	"encoding/json"
	"testing"
)

func TestCatalogsHaveIdenticalKeys(t *testing.T) {
	a, b := Load("zh-CN"), Load("en")
	if len(a) != len(b) {
		t.Fatal("catalog sizes differ")
	}
	for key, value := range a {
		if value == "" || b[key] == "" {
			t.Fatalf("missing translation: %s", key)
		}
	}
	for _, locale := range []string{"zh-CN", "en"} {
		data, _ := catalogs.ReadFile("locales/" + locale + ".json")
		if !json.Valid(data) {
			t.Fatal("invalid catalog")
		}
	}
}

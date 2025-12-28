package graph

import (
	"testing"
)

func TestQueryEngine_ExtractQueryTerms(t *testing.T) {
	engine := &QueryEngine{}

	tests := []struct {
		query    string
		expected []string
	}{
		{
			query:    "What is the fine for not wearing a helmet?",
			expected: []string{"fine", "wearing", "helmet"},
		},
		{
			query:    "Can I park in residential areas?",
			expected: []string{"park", "residential", "areas"},
		},
		{
			query:    "dual carriageway rules",
			expected: []string{"dual", "carriageway", "rules"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			terms := engine.extractQueryTerms(tt.query)

			// Check that some expected terms are found
			found := false
			for _, term := range terms {
				for _, expected := range tt.expected {
					if term == expected {
						found = true
						break
					}
				}
				if found {
					break
				}
			}

			if !found {
				t.Errorf("ExtractQueryTerms(%q) should contain at least one of %v. Got: %v",
					tt.query, tt.expected, terms)
			}
		})
	}
}

func TestIngestionService_BuildDocRef(t *testing.T) {
	service := &IngestionService{}

	doc := &Document{
		Title:  "Test Law",
		Type:   "Law",
		Number: stringPtr("123/2024"),
		Year:   intPtr(2024),
	}

	unit := &Unit{
		Code: stringPtr("Article 5"),
	}

	docRef := service.buildDocRef(doc, unit)
	expected := "Law 123/2024 2024 Article 5"

	if docRef != expected {
		t.Errorf("buildDocRef() = %q, want %q", docRef, expected)
	}
}

// Helper functions for tests
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

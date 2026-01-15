package query

import (
	"context"
	"fmt"
	"sort"

	"example.com/legallaw/internal/model"
)

// findAllCandidates finds concept and relation candidates for all query terms
func (s *Service) findAllCandidates(ctx context.Context, terms []string) ([]model.QueryCandidate, error) {
	var allCandidates []model.QueryCandidate

	for _, term := range terms {
		// Find concept candidates (subjects/objects)
		conceptCandidates, err := s.repo.FindConceptCandidates(ctx, term)
		if err != nil {
			return nil, fmt.Errorf("finding concept candidates for '%s': %w", term, err)
		}

		// Mark as potential subjects and objects
		for _, candidate := range conceptCandidates {
			// Add as subject candidate
			subjectCandidate := candidate
			subjectCandidate.Type = "subject"
			allCandidates = append(allCandidates, subjectCandidate)

			// Add as object candidate
			objectCandidate := candidate
			objectCandidate.Type = "object"
			allCandidates = append(allCandidates, objectCandidate)
		}

		// Find relation candidates
		relationCandidates, err := s.repo.FindRelationCandidates(ctx, term)
		if err != nil {
			return nil, fmt.Errorf("finding relation candidates for '%s': %w", term, err)
		}

		allCandidates = append(allCandidates, relationCandidates...)
	}

	// Deduplicate and sort by score
	candidateMap := make(map[string]model.QueryCandidate)
	for _, candidate := range allCandidates {
		key := fmt.Sprintf("%s_%s_%v_%v", candidate.Type, candidate.Name, candidate.ConceptID, candidate.RelationID)
		if existing, exists := candidateMap[key]; !exists || candidate.Score > existing.Score {
			candidateMap[key] = candidate
		}
	}

	var dedupedCandidates []model.QueryCandidate
	for _, candidate := range candidateMap {
		dedupedCandidates = append(dedupedCandidates, candidate)
	}

	sort.Slice(dedupedCandidates, func(i, j int) bool {
		return dedupedCandidates[i].Score > dedupedCandidates[j].Score
	})

	return dedupedCandidates, nil
}

// buildQueryStars creates star patterns from candidates
func (s *Service) buildQueryStars(candidates []model.QueryCandidate) []model.QueryStar {
	// Group candidates by type
	subjectCandidates := []model.QueryCandidate{}
	relationCandidates := []model.QueryCandidate{}
	objectCandidates := []model.QueryCandidate{}

	for _, candidate := range candidates {
		switch candidate.Type {
		case "subject":
			if len(subjectCandidates) < 5 { // Limit to top 5
				subjectCandidates = append(subjectCandidates, candidate)
			}
		case "relation":
			if len(relationCandidates) < 5 {
				relationCandidates = append(relationCandidates, candidate)
			}
		case "object":
			if len(objectCandidates) < 5 {
				objectCandidates = append(objectCandidates, candidate)
			}
		}
	}

	var stars []model.QueryStar

	// Create different star combinations

	// Star 1: All subjects, all relations, all objects (most comprehensive)
	if len(subjectCandidates) > 0 && len(relationCandidates) > 0 && len(objectCandidates) > 0 {
		stars = append(stars, model.QueryStar{
			SubjectCandidates:  subjectCandidates,
			RelationCandidates: relationCandidates,
			ObjectCandidates:   objectCandidates,
		})
	}

	// Star 2: Any subject, specific relations, any object (relation-focused)
	if len(relationCandidates) > 0 {
		stars = append(stars, model.QueryStar{
			SubjectCandidates:  subjectCandidates,
			RelationCandidates: relationCandidates[:min(2, len(relationCandidates))], // Top 2 relations
			ObjectCandidates:   objectCandidates,
		})
	}

	// Star 3: Specific subjects, any relation, any object (subject-focused)
	if len(subjectCandidates) > 0 {
		stars = append(stars, model.QueryStar{
			SubjectCandidates:  subjectCandidates[:min(3, len(subjectCandidates))], // Top 3 subjects
			RelationCandidates: relationCandidates,
			ObjectCandidates:   nil, // Allow any object
		})
	}

	// Star 4: Any subject, any relation, specific objects (object-focused)
	if len(objectCandidates) > 0 {
		stars = append(stars, model.QueryStar{
			SubjectCandidates:  nil, // Allow any subject
			RelationCandidates: relationCandidates,
			ObjectCandidates:   objectCandidates[:min(3, len(objectCandidates))], // Top 3 objects
		})
	}

	return stars
}

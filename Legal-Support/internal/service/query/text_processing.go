package query

import (
	"log"
	"sort"
	"strings"
	"sync"
)

// Vietnamese stopwords to filter out
var vietnameseStopwords = map[string]bool{
	"và": true, "của": true, "là": true, "có": true, "được": true,
	"trong": true, "với": true, "này": true, "để": true,
	"những": true, "các": true, "một": true, "không": true, "như": true,
	"khi": true, "về": true, "từ": true, "theo": true, "đã": true,
	"sẽ": true, "còn": true, "hay": true, "hoặc": true, "nếu": true,
	"thì": true, "mà": true, "bị": true, "đến": true, "tại": true,
	"sau": true, "trước": true, "nào": true, "ai": true, "gì": true,
	"sao": true, "thế": true, "vậy": true, "đây": true, "đó": true,
	"tôi": true, "bạn": true, "anh": true, "chị": true, "em": true,
	"ông": true, "bà": true, "họ": true, "chúng": true, "mình": true,
	"rồi": true, "rất": true, "quá": true, "lắm": true, "nhiều": true,
	"ít": true, "hơn": true, "nhất": true, "cũng": true, "vẫn": true,
	"đang": true, "phải": true, "cần": true, "nên": true, "muốn": true,
	"biết": true, "thấy": true, "làm": true, "đi": true, "ra": true,
	"vào": true, "lên": true, "xuống": true, "năm": true, "ngày": true,
	"tháng": true, "thế nào": true, "như thế nào": true, "bao nhiêu": true,
}

// legalKeywords are important legal terms that should always be kept
var legalKeywords = map[string]bool{
	// Vietnamese with diacritics
	"tội": true, "phạm": true, "tội phạm": true, "phạm tội": true,
	"giết": true, "người": true, "giết người": true, "tội giết người": true,
	"tự thú": true, "đầu thú": true, "ra tự thú": true, "ra đầu thú": true,
	"trốn": true, "bỏ trốn": true,
	"hình phạt": true, "phạt": true, "tù": true, "án": true, "mức án": true, "mức phạt": true,
	"giảm nhẹ": true, "tăng nặng": true, "tình tiết": true,
	"điều": true, "luật": true, "nghị định": true, "thông tư": true,
	"bộ luật": true, "hình sự": true, "dân sự": true,
	"vi phạm": true, "xử phạt": true, "xử lý": true,
	"khởi tố": true, "điều tra": true, "truy tố": true, "xét xử": true,
	"bị cáo": true, "bị hại": true, "bị can": true,
	"giao thông": true, "mũ bảo hiểm": true, "xe máy": true, "xe mô tô": true,
	"chung thân": true, "tử hình": true, "phạt tù": true, "năm tù": true,
	"hủy hoại": true, "chiếm đoạt": true, "tài sản": true, "trộm cắp": true, "cướp": true,
	"hợp đồng": true, "thuê": true, "tiền cọc": true, "nợ": true, "tranh chấp": true,
	"bồi thường": true, "thiệt hại": true,
	"thừa kế": true, "di sản": true, "di chúc": true, "chia tài sản": true,
	"hôn nhân": true, "gia đình": true, "ly hôn": true, "kết hôn": true,
	"ngoại tình": true, "tổn thương": true, "tinh thần": true, "tổn thương tinh thần": true,
	"chăm sóc": true, "nuôi con": true, "quyền nuôi": true, "thăm nom": true,
	"cho tặng": true, "tặng cho": true, "công chứng": true,
	// Non-diacritic versions
	"toi": true, "pham": true, "toi pham": true, "pham toi": true,
	"giet": true, "nguoi": true, "giet nguoi": true,
	"tu thu": true, "dau thu": true, "tron": true,
	"hinh phat": true, "tu": true, "an": true,
	"giam nhe": true, "tang nang": true, "tinh tiet": true,
	"dieu": true, "luat": true, "nghi dinh": true, "thong tu": true,
	"bo luat": true, "hinh su": true, "dan su": true,
	"vi pham": true, "xu phat": true, "xu ly": true,
	"khoi to": true, "dieu tra": true, "truy to": true, "xet xu": true,
	"bi cao": true, "bi hai": true, "bi can": true,
	"giao thong": true, "mu bao hiem": true, "xe may": true,
	"chung than": true, "tu hinh": true, "phat tu": true, "nam tu": true,
	"huy hoai": true, "chiem doat": true, "tai san": true, "trom cap": true, "cuop": true,
	"hop dong": true, "thue": true, "tien coc": true, "no": true, "tranh chap": true,
	"boi thuong": true, "thiet hai": true,
	"thua ke": true, "di san": true, "di chuc": true, "chia tai san": true,
	"hon nhan": true, "gia dinh": true, "ly hon": true, "ket hon": true,
	"ngoai tinh": true, "ton thuong": true, "tinh than": true, "ton thuong tinh than": true,
	"cham soc": true, "nuoi con": true, "quyen nuoi": true, "tham nom": true,
	"cho tang": true, "tang cho": true, "cong chung": true,
}

// databaseBigrams stores bigrams loaded from database (concepts table)
// This is populated once at startup and cached for performance
var (
	databaseBigrams     map[string]bool
	bigramsLoadedOnce   sync.Once
	bigramsLoadMutex    sync.RWMutex
)

// SetDatabaseBigrams updates the database bigrams cache
// This should be called once during service initialization
func SetDatabaseBigrams(bigrams map[string]bool) {
	bigramsLoadMutex.Lock()
	defer bigramsLoadMutex.Unlock()
	databaseBigrams = bigrams
	log.Printf("[TextProcessing] Loaded %d bigrams from database", len(bigrams))
}

// getDatabaseBigrams safely retrieves database bigrams
func getDatabaseBigrams() map[string]bool {
	bigramsLoadMutex.RLock()
	defer bigramsLoadMutex.RUnlock()
	return databaseBigrams
}

// BigramInfo tracks bigram with its priority
type BigramInfo struct {
	text     string
	priority int // 1=hardcoded, 2=database, 3=auto-extracted
}

// countByPriority counts bigrams with specific priority
func countByPriority(bigrams []BigramInfo, priority int) int {
	count := 0
	for _, bg := range bigrams {
		if bg.priority == priority {
			count++
		}
	}
	return count
}

// ExtractMeaningfulWords extracts meaningful words AND bi-grams from Vietnamese text
func ExtractMeaningfulWords(text string) []string {
	log.Printf("[ExtractKeywords] Input text: %q", text)

	// Normalize text
	text = strings.ToLower(text)

	// Normalize whitespace: replace all Unicode spaces with regular space
	// This includes non-breaking space (U+00A0), thin space (U+2009), etc.
	text = strings.ReplaceAll(text, "\u00A0", " ") // Non-breaking space
	text = strings.ReplaceAll(text, "\u2009", " ") // Thin space
	text = strings.ReplaceAll(text, "\u200B", " ") // Zero-width space
	text = strings.Join(strings.Fields(text), " ") // Collapse multiple spaces

	log.Printf("[ExtractKeywords] After normalize: %q", text)

	// Split into words (simple whitespace split)
	words := strings.Fields(text)
	log.Printf("[ExtractKeywords] Words after split: %d items: %v", len(words), words)

	// Clean words first
	var cleanWords []string
	for _, w := range words {
		// Remove punctuation
		w = strings.Trim(w, ".,!?:;\"'()[]{}")
		if w != "" {
			cleanWords = append(cleanWords, w)
		}
	}

	var result []string
	seen := make(map[string]bool)
	usedInBigram := make(map[int]bool) // Track which word indices are used in bigrams

	// Get database bigrams (loaded at startup)
	dbBigrams := getDatabaseBigrams()

	// Track bigram priority for sorting
	var bigrams []BigramInfo

	// 1. PRIORITY: Bi-grams first (Two words) - more specific
	for i := 0; i < len(cleanWords)-1; i++ {
		bigram := cleanWords[i] + " " + cleanWords[i+1]

		// Skip if already seen
		if seen[bigram] {
			continue
		}

		var priority int
		var shouldInclude bool

		// Check priority:
		// Priority 1: Hardcoded legal keywords (core terms)
		if legalKeywords[bigram] {
			priority = 1
			shouldInclude = true
		} else if dbBigrams != nil && dbBigrams[bigram] {
			// Priority 2: Database bigrams (auto-learned from concepts)
			priority = 2
			shouldInclude = true
		} else {
			// Priority 3: Auto-extract if NOT stopword combination
			word1IsStop := vietnameseStopwords[cleanWords[i]]
			word2IsStop := vietnameseStopwords[cleanWords[i+1]]

			// Accept if at least one word is NOT a stopword
			if !word1IsStop || !word2IsStop {
				priority = 3
				shouldInclude = true
			}
		}

		if shouldInclude {
			bigrams = append(bigrams, BigramInfo{text: bigram, priority: priority})
			seen[bigram] = true
			// Mark these words as used in bigram
			usedInBigram[i] = true
			usedInBigram[i+1] = true
		}
	}

	// Sort bigrams by priority (lower = better)
	sort.Slice(bigrams, func(i, j int) bool {
		return bigrams[i].priority < bigrams[j].priority
	})

	// Add bigrams to result (high priority first)
	for _, bg := range bigrams {
		result = append(result, bg.text)
	}

	log.Printf("[ExtractKeywords] Bigrams found: %d (priority 1: %d, priority 2: %d, priority 3: %d)",
		len(bigrams),
		countByPriority(bigrams, 1),
		countByPriority(bigrams, 2),
		countByPriority(bigrams, 3))

	// 2. FALLBACK: Single words (Uni-grams) - only if NOT used in bigram
	for i, w := range cleanWords {
		// Skip if this word is part of a bigram
		if usedInBigram[i] {
			continue
		}
		// If it's a stopword AND NOT a legal keyword, skip
		if vietnameseStopwords[w] && !legalKeywords[w] {
			continue
		}
		if !seen[w] {
			result = append(result, w)
			seen[w] = true
		}
	}

	// 3. LIMIT keywords to prevent query slowdown
	// Keep top 10 keywords (bigrams are already prioritized)
	maxKeywords := 10
	if len(result) > maxKeywords {
		log.Printf("[ExtractKeywords] Limiting %d keywords to top %d", len(result), maxKeywords)
		result = result[:maxKeywords]
	}

	log.Printf("[ExtractKeywords] Final keywords: %v (count: %d)", result, len(result))
	return result
}

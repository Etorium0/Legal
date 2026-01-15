package prompt

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

// PromptConfig holds all prompt configurations
type PromptConfig struct {
	Prompts map[string]PromptTemplate `yaml:"prompts"`
}

// PromptTemplate represents a single prompt template
type PromptTemplate struct {
	System   string `yaml:"system"`
	User     string `yaml:"user"`
	Response string `yaml:"response"`
}

// PromptManager manages prompt templates loaded from YAML
type PromptManager struct {
	config *PromptConfig
	mu     sync.RWMutex
}

var (
	defaultPromptManager *PromptManager
	promptManagerOnce    sync.Once
)

// GetPromptManager returns the singleton prompt manager
func GetPromptManager() *PromptManager {
	promptManagerOnce.Do(func() {
		defaultPromptManager = &PromptManager{}
		// Try to load from default locations
		paths := []string{
			"prompts.yaml",
			"internal/graph/prompts.yaml",
			"/app/prompts.yaml",
		}
		for _, p := range paths {
			if err := defaultPromptManager.LoadFromFile(p); err == nil {
				fmt.Printf("Loaded prompts from %s\n", p)
				break
			}
		}
	})
	return defaultPromptManager
}

// LoadFromFile loads prompt configuration from a YAML file
func (pm *PromptManager) LoadFromFile(path string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return err
	}

	var config PromptConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return err
	}

	pm.config = &config
	return nil
}

// LoadFromString loads prompt configuration from a YAML string
func (pm *PromptManager) LoadFromString(yamlContent string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	var config PromptConfig
	if err := yaml.Unmarshal([]byte(yamlContent), &config); err != nil {
		return err
	}

	pm.config = &config
	return nil
}

// GetSystemPrompt returns the system prompt for a given template name
func (pm *PromptManager) GetSystemPrompt(name string) string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if pm.config == nil {
		return getDefaultSystemPrompt(name)
	}

	if template, ok := pm.config.Prompts[name]; ok {
		return template.System
	}

	return getDefaultSystemPrompt(name)
}

// GetUserPrompt returns the user prompt template for a given template name
func (pm *PromptManager) GetUserPrompt(name string) string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if pm.config == nil {
		return getDefaultUserPrompt(name)
	}

	if template, ok := pm.config.Prompts[name]; ok {
		return template.User
	}

	return getDefaultUserPrompt(name)
}

// GetResponse returns a static response for a given template name
func (pm *PromptManager) GetResponse(name string) string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if pm.config == nil {
		return getDefaultResponse(name)
	}

	if template, ok := pm.config.Prompts[name]; ok {
		return template.Response
	}

	return getDefaultResponse(name)
}

// FormatPrompt formats a prompt template with the given variables
func (pm *PromptManager) FormatPrompt(template string, vars map[string]string) string {
	result := template
	for key, value := range vars {
		placeholder := "{" + key + "}"
		result = strings.ReplaceAll(result, placeholder, value)
	}
	return result
}

// GetFormattedSystemPrompt returns a formatted system prompt
func (pm *PromptManager) GetFormattedSystemPrompt(name string, vars map[string]string) string {
	template := pm.GetSystemPrompt(name)
	return pm.FormatPrompt(template, vars)
}

// GetFormattedUserPrompt returns a formatted user prompt
func (pm *PromptManager) GetFormattedUserPrompt(name string, vars map[string]string) string {
	template := pm.GetUserPrompt(name)
	return pm.FormatPrompt(template, vars)
}

// ============================================================================
// Default prompts (fallback when YAML not loaded)
// ============================================================================

func getDefaultSystemPrompt(name string) string {
	defaults := map[string]string{
		"query_rewrite": `Bạn là trợ lý AI chuyên về pháp luật Việt Nam. Từ câu hỏi gốc, tạo ra 3 câu truy vấn mới để cải thiện khả năng tìm kiếm. Trả về ĐÚNG 3 câu, mỗi câu trên một dòng. KHÔNG đánh số.`,

		"answer": `Bạn là Trợ lý Pháp luật Việt Nam. Trả lời câu hỏi dựa trên nội dung tham khảo được cung cấp. Nếu không đủ thông tin, hãy nói rằng bạn không có đủ dữ liệu. Trả lời bằng tiếng Việt.`,

		"answer_with_history": `Bạn là Trợ lý Pháp luật Việt Nam. Trả lời câu hỏi dựa trên lịch sử hội thoại và nội dung tham khảo. Trả lời bằng tiếng Việt.`,

		"classify": `Phân loại câu hỏi: 0=chào hỏi/hệ thống, 1=pháp luật, 2=không liên quan. Trả về DUY NHẤT một số.`,

		"extract_entities": `Trích xuất thông tin pháp lý từ câu hỏi. Trả về JSON với các trường: year, document_number, document_type, article, clause, authority, keywords.`,
	}

	if prompt, ok := defaults[name]; ok {
		return prompt
	}
	return ""
}

func getDefaultUserPrompt(name string) string {
	defaults := map[string]string{
		"query_rewrite": "Câu hỏi gốc: {query}",
		"answer":        "Câu hỏi: {question}\n\nNội dung tham khảo:\n{context}",
		"answer_with_history": `Lịch sử hội thoại:
{history}

Câu hỏi hiện tại: {question}

Nội dung tham khảo:
{context}`,
		"classify":         "Câu hỏi: {query}",
		"extract_entities": "Câu hỏi: {query}",
	}

	if prompt, ok := defaults[name]; ok {
		return prompt
	}
	return ""
}

func getDefaultResponse(name string) string {
	defaults := map[string]string{
		"greeting": `Xin chào! Tôi là Trợ lý Pháp luật Việt Nam. Tôi có thể giúp bạn tra cứu các quy định pháp luật, giải đáp thắc mắc về luật. Hãy đặt câu hỏi để tôi hỗ trợ bạn!`,

		"invalid": `Xin lỗi, tôi không thể xử lý câu hỏi này. Vui lòng đặt câu hỏi liên quan đến pháp luật Việt Nam.`,

		"no_results": `Xin lỗi, tôi không tìm thấy thông tin phù hợp. Bạn có thể thử diễn đạt câu hỏi theo cách khác.`,
	}

	if response, ok := defaults[name]; ok {
		return response
	}
	return ""
}

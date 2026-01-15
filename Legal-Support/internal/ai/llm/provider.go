package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// Improved prompts for Vietnamese legal domain
const (
	// System prompt for answering legal questions
	LegalAnswerSystemPrompt = `### ROLE:
Bạn là Trợ lý Pháp luật Việt Nam với hơn 30 năm kinh nghiệm chuyên môn.

### TASKS:
Trả lời câu hỏi của người dùng về pháp luật Việt Nam dựa trên nội dung tham khảo được cung cấp.

### HƯỚNG DẪN QUAN TRỌNG:
1. **Hiểu câu hỏi**: Phân tích kỹ câu hỏi - người dùng muốn biết HẬU QUẢ PHÁP LÝ, MỨC PHẠT, hay QUYỀN LỢI của họ.

2. **TRẢ LỜI TRỰC TIẾP VÀO VẤN ĐỀ**:
   - Nếu hỏi "thì như nào", "thì sao", "bị gì" → Giải thích HẬU QUẢ PHÁP LÝ cụ thể
   - Nếu hỏi về tội phạm → Nêu rõ MỨC HÌNH PHẠT (bao nhiêu năm tù, phạt tiền...)
   - Nếu có tình tiết giảm nhẹ/tăng nặng → Giải thích ẢNH HƯỞNG đến mức án
   - KHÔNG chỉ liệt kê điều luật mà phải GIẢI THÍCH Ý NGHĨA cho người dùng

3. **CẤU TRÚC CÂU TRẢ LỜI**:
   - Mở đầu: Tóm tắt 1-2 câu về tình huống pháp lý
   - Thân bài: Phân tích chi tiết với trích dẫn điều luật
   - Kết luận: **TRẢ LỜI RÕ RÀNG** cho câu hỏi (VD: "Với tình huống của bạn, mức án có thể là...")

4. **Nếu context không đủ**: Trả lời:
   "Xin lỗi bạn. Kiến thức này nằm ngoài phạm vi hiểu biết của tôi. Bạn có thể hỏi câu hỏi khác không?"

5. **Trích dẫn nguồn**: Ghi rõ (Điều X, Luật Y) sau mỗi thông tin pháp lý.

### NGÔN NGỮ:
Trả lời bằng tiếng Việt, dễ hiểu cho người dân thông thường.`

	// System prompt for query rewriting
	QueryRewriteSystemPrompt = `### ROLE:
Bạn là trợ lý AI chuyên về pháp luật Việt Nam, có hơn 10 năm kinh nghiệm tối ưu hóa truy vấn và phân tích ngữ nghĩa.

### TASKS:
Từ câu hỏi gốc, tạo ra **3 câu truy vấn mới** để cải thiện khả năng tìm kiếm.

### HƯỚNG DẪN:
1. **Giữ nguyên ý chính** của câu hỏi gốc
2. **Thay đổi cách diễn đạt** sử dụng từ đồng nghĩa và thuật ngữ pháp lý
3. **Đảm bảo độ tương đồng ngữ nghĩa** ít nhất 85%
4. **Ưu tiên thuật ngữ pháp lý** như: điều, khoản, quy định, văn bản pháp luật, nghĩa vụ, quyền, hợp đồng...

### VÍ DỤ:
- "Bao nhiêu tuổi thì được kết hôn?" → 
  + "Độ tuổi tối thiểu đăng ký kết hôn theo quy định pháp luật Việt Nam"
  + "Điều kiện về tuổi để kết hôn hợp pháp"
  + "Luật Hôn nhân và Gia đình quy định độ tuổi kết hôn như thế nào"

- "Thủ tục thành lập công ty" →
  + "Quy trình đăng ký thành lập doanh nghiệp"
  + "Hồ sơ và thủ tục đăng ký kinh doanh"
  + "Điều kiện và thủ tục thành lập công ty theo Luật Doanh nghiệp"

### OUTPUT:
Trả về ĐÚNG 3 câu truy vấn, mỗi câu trên một dòng. KHÔNG đánh số. KHÔNG giải thích.`
)

// QAProvider generates answers given a question and retrieved context.
type QAProvider interface {
	Answer(ctx context.Context, question, context string) (string, error)
	RewriteQuery(ctx context.Context, query string) ([]string, error)
	ExpandKeywords(ctx context.Context, question string, keywords []string) ([]string, error)
}

// OpenAIQAProvider uses OpenAI chat models to generate answers.
type OpenAIQAProvider struct {
	client *openai.Client
	model  string
}

func NewOpenAIQAProvider(apiKey, model string) *OpenAIQAProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIQAProvider{client: openai.NewClient(apiKey), model: model}
}

func (p *OpenAIQAProvider) Answer(ctx context.Context, question, contextStr string) (string, error) {
	if p == nil {
		return "", errors.New("qa provider not configured")
	}
	if question == "" {
		return "", errors.New("question required")
	}

	promptUser := fmt.Sprintf(`### CÂU HỎI:
%s

### NỘI DUNG THAM KHẢO:
%s

### YÊU CẦU:
Dựa trên nội dung tham khảo ở trên, hãy trả lời câu hỏi một cách chi tiết và chính xác.`, question, contextStr)

	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: p.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: LegalAnswerSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: promptUser},
		},
		Temperature: 0.2,
		MaxTokens:   2000,
	})
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", errors.New("empty completion")
	}
	return resp.Choices[0].Message.Content, nil
}

func (p *OpenAIQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if p == nil {
		return []string{query}, nil
	}

	promptUser := fmt.Sprintf("Câu hỏi gốc: %s", query)

	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: p.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: QueryRewriteSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: promptUser},
		},
		Temperature: 0.7,
	})
	if err != nil {
		return []string{query}, err // Fallback to original query
	}
	if len(resp.Choices) == 0 {
		return []string{query}, nil
	}

	content := resp.Choices[0].Message.Content
	lines := strings.Split(content, "\n")
	var queries []string
	queries = append(queries, query) // Always include original
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Remove numbering if present (1., 2., -, *, etc.)
		trimmed = strings.TrimLeft(trimmed, "0123456789.-*) ")
		if trimmed != "" && trimmed != query {
			queries = append(queries, trimmed)
		}
	}
	return queries, nil
}

// ExpandKeywords for OpenAI - returns original keywords (stub)
func (p *OpenAIQAProvider) ExpandKeywords(ctx context.Context, question string, keywords []string) ([]string, error) {
	return keywords, nil
}

// GeminiQAProvider uses Google Gemini models.
type GeminiQAProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGeminiQAProvider(apiKey, model string) *GeminiQAProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "gemini-1.5-flash"
	}
	return &GeminiQAProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

func (p *GeminiQAProvider) Answer(ctx context.Context, question, contextStr string) (string, error) {
	if p == nil {
		return "", errors.New("qa provider not configured")
	}

	prompt := fmt.Sprintf(`%s

### CÂU HỎI:
%s

### NỘI DUNG THAM KHẢO:
%s

### YÊU CẦU:
Dựa trên nội dung tham khảo ở trên, hãy trả lời câu hỏi một cách chi tiết và chính xác.`, LegalAnswerSystemPrompt, question, contextStr)

	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":generateContent?key=" + p.apiKey

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []Part `json:"parts"`
	}
	type GenerationConfig struct {
		Temperature     float32 `json:"temperature"`
		MaxOutputTokens int     `json:"maxOutputTokens"`
	}
	type Request struct {
		Contents         []Content        `json:"contents"`
		GenerationConfig GenerationConfig `json:"generationConfig"`
	}

	reqBody := Request{
		Contents: []Content{
			{Parts: []Part{{Text: prompt}}},
		},
		GenerationConfig: GenerationConfig{
			Temperature:     0.2,
			MaxOutputTokens: 2000,
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Try to read error body for debugging
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		return "", fmt.Errorf("gemini api error: %d - %s", resp.StatusCode, buf.String())
	}

	type Response struct {
		Candidates []struct {
			Content Content `json:"content"`
		} `json:"candidates"`
	}

	var geminiResp Response
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("empty response from gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

func (p *GeminiQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if p == nil {
		return []string{query}, nil
	}

	prompt := fmt.Sprintf(`%s

Câu hỏi gốc: %s`, QueryRewriteSystemPrompt, query)

	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":generateContent?key=" + p.apiKey

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []Part `json:"parts"`
	}
	type GenerationConfig struct {
		Temperature float32 `json:"temperature"`
	}
	type Request struct {
		Contents         []Content        `json:"contents"`
		GenerationConfig GenerationConfig `json:"generationConfig"`
	}

	reqBody := Request{
		Contents: []Content{
			{Parts: []Part{{Text: prompt}}},
		},
		GenerationConfig: GenerationConfig{
			Temperature: 0.7,
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return []string{query}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return []string{query}, fmt.Errorf("gemini api error: %d", resp.StatusCode)
	}

	type Response struct {
		Candidates []struct {
			Content Content `json:"content"`
		} `json:"candidates"`
	}

	var geminiResp Response
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return []string{query}, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return []string{query}, nil
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	lines := strings.Split(text, "\n")
	var queries []string
	queries = append(queries, query)
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Remove numbering if present
		trimmed = strings.TrimLeft(trimmed, "0123456789.-*) ")
		if trimmed != "" && trimmed != query {
			queries = append(queries, trimmed)
		}
	}
	return queries, nil
}

// ExpandKeywords uses Gemini to expand keywords with legal synonyms
func (p *GeminiQAProvider) ExpandKeywords(ctx context.Context, question string, keywords []string) ([]string, error) {
	if p == nil || len(keywords) == 0 {
		return keywords, nil
	}

	prompt := fmt.Sprintf(`Bạn là chuyên gia pháp luật Việt Nam. Phân tích câu hỏi và mở rộng từ khóa.

Câu hỏi: %s
Từ khóa gốc: %s

NHIỆM VỤ: Thêm các từ khóa PHÁP LÝ đồng nghĩa hoặc liên quan trực tiếp.

QUY TẮC BẮT BUỘC:
1. Với "giảm án/được giảm" → PHẢI thêm: "tình tiết giảm nhẹ", "giảm nhẹ trách nhiệm hình sự", "Điều 51"
2. Với "tăng án/nặng hơn" → PHẢI thêm: "tình tiết tăng nặng", "Điều 52"
3. Với "tự thú" → PHẢI thêm: "đầu thú", "khai báo"
4. Với "phạm tội/tội" → PHẢI thêm: "người phạm tội", "hình phạt"

ĐỊNH DẠNG: Mỗi từ khóa mới trên 1 dòng. KHÔNG đánh số. KHÔNG giải thích.
Tối đa 5 từ khóa mới.`, question, strings.Join(keywords, ", "))

	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":generateContent?key=" + p.apiKey

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []Part `json:"parts"`
	}
	type GenerationConfig struct {
		Temperature     float32 `json:"temperature"`
		MaxOutputTokens int     `json:"maxOutputTokens"`
	}
	type Request struct {
		Contents         []Content        `json:"contents"`
		GenerationConfig GenerationConfig `json:"generationConfig"`
	}

	reqBody := Request{
		Contents: []Content{
			{Parts: []Part{{Text: prompt}}},
		},
		GenerationConfig: GenerationConfig{
			Temperature:     0.3,
			MaxOutputTokens: 100,
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return keywords, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return keywords, nil // Return original on error
	}

	type Response struct {
		Candidates []struct {
			Content Content `json:"content"`
		} `json:"candidates"`
	}

	var geminiResp Response
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return keywords, nil
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return keywords, nil
	}

	// Parse expanded keywords
	text := geminiResp.Candidates[0].Content.Parts[0].Text
	result := make([]string, 0, len(keywords)+5)
	result = append(result, keywords...) // Keep original keywords
	seen := make(map[string]bool)
	for _, kw := range keywords {
		seen[strings.ToLower(kw)] = true
	}

	for _, line := range strings.Split(text, "\n") {
		trimmed := strings.TrimSpace(line)
		trimmed = strings.TrimLeft(trimmed, "0123456789.-*•) ")
		trimmed = strings.Trim(trimmed, "\"'")
		if trimmed != "" && !seen[strings.ToLower(trimmed)] {
			seen[strings.ToLower(trimmed)] = true
			result = append(result, trimmed)
		}
	}

	// Fallback expansion for common legal terms not covered by Gemini
	// These are PREPENDED to ensure they're used in search (top 5 keywords)
	questionLower := strings.ToLower(question)
	fallbackExpansions := map[string][]string{
		"giảm án":   {"tình tiết giảm nhẹ", "giảm nhẹ trách nhiệm hình sự"},
		"được giảm": {"tình tiết giảm nhẹ", "giảm nhẹ"},
		"giảm hình": {"tình tiết giảm nhẹ", "giảm nhẹ"},
		"tăng án":   {"tình tiết tăng nặng", "tăng nặng trách nhiệm hình sự"},
		"nặng hơn":  {"tình tiết tăng nặng"},
		"tự thú":    {"đầu thú", "người phạm tội tự thú"},
		"đầu thú":   {"tự thú", "người phạm tội đầu thú"},
	}
	var fallbackKeywords []string
	for term, expansions := range fallbackExpansions {
		if strings.Contains(questionLower, term) {
			for _, exp := range expansions {
				if !seen[strings.ToLower(exp)] {
					seen[strings.ToLower(exp)] = true
					fallbackKeywords = append(fallbackKeywords, exp)
				}
			}
		}
	}
	// Prepend fallback keywords to ensure they're in top 5
	if len(fallbackKeywords) > 0 {
		result = append(fallbackKeywords, result...)
	}

	return result, nil
}

// GroqQAProvider uses Groq API (OpenAI-compatible) for fast inference
type GroqQAProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGroqQAProvider(apiKey, model string) *GroqQAProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "llama-3.3-70b-versatile"
	}
	return &GroqQAProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// Implement QAProvider for GroqQAProvider (using same logic as Gemini/OpenAI but with Groq endpoint)
// Since Groq is OpenAI compatible, we could potentially reuse OpenAI client if we change BaseURL.
// But for now, let's keep it simple or minimal since the original code didn't fully implement it in the read snippet.
// Wait, the read snippet cut off NewGroqQAProvider. I'll implement Answer using standard HTTP to be safe.

func (p *GroqQAProvider) Answer(ctx context.Context, question, contextStr string) (string, error) {
	// Groq uses OpenAI compatible API at https://api.groq.com/openai/v1/chat/completions
	url := "https://api.groq.com/openai/v1/chat/completions"

	promptUser := fmt.Sprintf(`### CÂU HỎI:
%s

### NỘI DUNG THAM KHẢO:
%s

### YÊU CẦU:
Dựa trên nội dung tham khảo ở trên, hãy trả lời câu hỏi một cách chi tiết và chính xác.`, question, contextStr)

	requestBody := map[string]interface{}{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": LegalAnswerSystemPrompt},
			{"role": "user", "content": promptUser},
		},
		"temperature": 0.2,
		"max_tokens":  2000,
	}

	jsonBody, _ := json.Marshal(requestBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		return "", fmt.Errorf("groq api error: %d - %s", resp.StatusCode, buf.String())
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", errors.New("empty response from groq")
	}

	return result.Choices[0].Message.Content, nil
}

func (p *GroqQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	// Simple passthrough for now or implement similar to others
	return []string{query}, nil
}

func (p *GroqQAProvider) ExpandKeywords(ctx context.Context, question string, keywords []string) ([]string, error) {
	return keywords, nil
}

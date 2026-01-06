package graph

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

### HƯỚNG DẪN:
1. **Hiểu câu hỏi**: Phân tích kỹ câu hỏi, bao gồm các từ đồng nghĩa và ý nghĩa ngầm.

2. **Nếu context không đủ**: Trả lời:
   "Xin lỗi bạn. Kiến thức này nằm ngoài phạm vi hiểu biết của tôi dựa trên tài liệu được cung cấp. Bạn có thể hỏi tôi một câu hỏi khác không?"

3. **Viết câu trả lời**:
   - Bắt đầu bằng tóm tắt ngắn gọn về vấn đề pháp lý
   - Cung cấp lập luận rõ ràng, có cấu trúc (dùng bullet points hoặc numbered lists)
   - KHÔNG bịa đặt thông tin hoặc giải thích pháp lý
   - Chỉ rút ra kết luận được hỗ trợ rõ ràng từ tài liệu
   - Kết thúc bằng câu trả lời trực tiếp cho câu hỏi

4. **Trích dẫn nguồn**: Khi có thể, đề cập đến văn bản pháp luật cụ thể (Luật, Nghị định, Thông tư...) từ context.

### NGÔN NGỮ:
Trả lời bằng tiếng Việt.`

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

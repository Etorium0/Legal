package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// StreamChunk represents a chunk of streamed response
type StreamChunk struct {
	Content string `json:"content"`
	Done    bool   `json:"done"`
	Error   string `json:"error,omitempty"`
}

// StreamWriter interface for writing streaming responses
type StreamWriter interface {
	Write(chunk StreamChunk) error
	Flush()
}

// HTTPStreamWriter implements StreamWriter for HTTP responses
type HTTPStreamWriter struct {
	w       http.ResponseWriter
	flusher http.Flusher
}

// NewHTTPStreamWriter creates a new HTTP stream writer
func NewHTTPStreamWriter(w http.ResponseWriter) (*HTTPStreamWriter, error) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf("streaming not supported")
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	return &HTTPStreamWriter{
		w:       w,
		flusher: flusher,
	}, nil
}

// Write sends a chunk to the client
func (sw *HTTPStreamWriter) Write(chunk StreamChunk) error {
	data, err := json.Marshal(chunk)
	if err != nil {
		return err
	}

	// SSE format
	_, err = fmt.Fprintf(sw.w, "data: %s\n\n", data)
	if err != nil {
		return err
	}

	sw.flusher.Flush()
	return nil
}

// Flush forces a flush to the client
func (sw *HTTPStreamWriter) Flush() {
	sw.flusher.Flush()
}

// ============================================================================
// OpenAI Streaming Client
// ============================================================================

// OpenAIStreamResponse represents a streaming response chunk
type OpenAIStreamResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index int `json:"index"`
		Delta struct {
			Content string `json:"content"`
			Role    string `json:"role,omitempty"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
}

// StreamingLLMClient handles streaming LLM responses
type StreamingLLMClient struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

// NewStreamingLLMClient creates a new streaming LLM client
func NewStreamingLLMClient(apiKey, model string) *StreamingLLMClient {
	return &StreamingLLMClient{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1",
		model:   model,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // Longer timeout for streaming
		},
	}
}

// StreamChat sends a streaming chat completion request
func (c *StreamingLLMClient) StreamChat(ctx context.Context, systemPrompt, userPrompt string, writer StreamWriter) error {
	// Build request body
	reqBody := map[string]interface{}{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"stream":      true,
		"temperature": 0.3,
		"max_tokens":  2048,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", strings.NewReader(string(bodyBytes)))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error: %d - %s", resp.StatusCode, string(body))
	}

	// Read streaming response
	reader := resp.Body
	buffer := make([]byte, 4096)
	var lineBuffer strings.Builder

	for {
		n, err := reader.Read(buffer)
		if n > 0 {
			lineBuffer.Write(buffer[:n])

			// Process complete lines
			content := lineBuffer.String()
			lines := strings.Split(content, "\n")

			// Keep incomplete line in buffer
			if !strings.HasSuffix(content, "\n") {
				lineBuffer.Reset()
				lineBuffer.WriteString(lines[len(lines)-1])
				lines = lines[:len(lines)-1]
			} else {
				lineBuffer.Reset()
			}

			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || line == "data: [DONE]" {
					continue
				}

				if !strings.HasPrefix(line, "data: ") {
					continue
				}

				jsonData := strings.TrimPrefix(line, "data: ")
				var streamResp OpenAIStreamResponse
				if err := json.Unmarshal([]byte(jsonData), &streamResp); err != nil {
					continue
				}

				if len(streamResp.Choices) > 0 {
					content := streamResp.Choices[0].Delta.Content
					if content != "" {
						if err := writer.Write(StreamChunk{Content: content}); err != nil {
							return err
						}
					}

					if streamResp.Choices[0].FinishReason != nil {
						writer.Write(StreamChunk{Done: true})
						return nil
					}
				}
			}
		}

		if err == io.EOF {
			writer.Write(StreamChunk{Done: true})
			return nil
		}
		if err != nil {
			return err
		}
	}
}

// ============================================================================
// Channel-based streaming (for internal use)
// ============================================================================

// ChannelStreamWriter implements StreamWriter for Go channels
type ChannelStreamWriter struct {
	ch chan<- StreamChunk
}

// NewChannelStreamWriter creates a channel-based stream writer
func NewChannelStreamWriter(ch chan<- StreamChunk) *ChannelStreamWriter {
	return &ChannelStreamWriter{ch: ch}
}

// Write sends a chunk to the channel
func (cw *ChannelStreamWriter) Write(chunk StreamChunk) error {
	select {
	case cw.ch <- chunk:
		return nil
	default:
		return fmt.Errorf("channel full or closed")
	}
}

// Flush is a no-op for channel writer
func (cw *ChannelStreamWriter) Flush() {}

// StreamChatToChannel streams chat response to a channel
func (c *StreamingLLMClient) StreamChatToChannel(ctx context.Context, systemPrompt, userPrompt string) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk, 100)
	writer := NewChannelStreamWriter(ch)

	go func() {
		defer close(ch)
		if err := c.StreamChat(ctx, systemPrompt, userPrompt, writer); err != nil {
			ch <- StreamChunk{Error: err.Error(), Done: true}
		}
	}()

	return ch, nil
}

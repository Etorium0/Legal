package whisper

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"time"

	whisper "github.com/ggerganov/whisper.cpp/bindings/go"
	klog "k8s.io/klog/v2"

	microphone "github.com/dvonthenen/open-virtual-assistant/pkg/microphone"
	"github.com/dvonthenen/open-virtual-assistant/pkg/transcriber/config"
)

const (
	DefaultModelPath = "models/ggml-tiny.en.bin" // ~39MB, faster than ggml-base.en.bin (~142MB)
	DefaultModelURL  = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
)

type Transcribe struct {
	options *config.TranscribeOptions

	modelPath string
	model     *whisper.Context

	mic *microphone.Microphone

	ctx       context.Context
	ctxCancel context.CancelFunc
}

var (
	ErrInvalidInput = errors.New("required input was not found")
	ErrModelNotFound = errors.New("whisper model not found")
)

var micInitAlready = false

func New(ctx context.Context, opts *config.TranscribeOptions) (*Transcribe, error) {
	if opts.InputChannels == 0 {
		opts.InputChannels = 1
	}
	if opts.SamplingRate == 0 {
		opts.SamplingRate = 16000
	}
	if ctx == nil {
		ctx = context.Background()
	}

	if !micInitAlready {
		klog.V(4).Infof("Calling microphone.Initialize...")
		microphone.Initialize()
		micInitAlready = true
	}

	mic, err := microphone.New(microphone.AudioConfig{
		InputChannels: opts.InputChannels,
		SamplingRate:  float32(opts.SamplingRate),
	})
	if err != nil {
		klog.V(1).Infof("New failed. Err: %v\n", err)
		return nil, err
	}

	// check if model exists
	modelPath := DefaultModelPath
	if v := os.Getenv("WHISPER_MODEL_PATH"); v != "" {
		modelPath = v
	}

	if _, err := os.Stat(modelPath); os.IsNotExist(err) {
		klog.V(1).Infof("Whisper model not found at %s", modelPath)
		klog.V(2).Infof("Please download from: %s", DefaultModelURL)
		klog.V(2).Infof("Or set WHISPER_MODEL_PATH environment variable")
		klog.V(2).Infof("Run: .\download_whisper_model.ps1")
		return nil, ErrModelNotFound
	}

	// load whisper model
	model, err := whisper.NewContext(modelPath)
	if err != nil {
		klog.V(1).Infof("whisper.NewContext failed. Err: %v\n", err)
		return nil, err
	}

	// set whisper params
	model.SetThreads(4) // adjust based on CPU cores
	model.SetLanguage("en")

	t := &Transcribe{
		options:   opts,
		mic:       mic,
		modelPath: modelPath,
		model:     model,
		ctx:       ctx,
	}
	t.ctx, t.ctxCancel = context.WithCancel(ctx)

	return t, nil
}

func (t *Transcribe) Start() error {
	klog.V(5).Infof("whisper transcribe.Start ENTER\n")
	if err := t.mic.Start(); err != nil {
		klog.V(1).Infof("mic.Start failed. Err: %v\n", err)
		return err
	}

	go t.streamLoop()
	klog.V(4).Infof("whisper transcribe.Start Succeeded\n")
	return nil
}

func (t *Transcribe) streamLoop() {
	// buffer for audio chunks
	audioBuffer := make([]float32, 0, 16000*2) // 2 seconds buffer
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-t.ctx.Done():
			return
		case <-ticker.C:
			buf, err := t.mic.Read()
			if err != nil {
				klog.V(1).Infof("mic.Read failed. Err: %v\n", err)
				continue
			}

			// convert int16 to float32 and add to buffer
			for _, sample := range buf {
				audioBuffer = append(audioBuffer, float32(sample)/32768.0)
			}

			// process buffer when it's long enough (about 1 second)
			if len(audioBuffer) >= 16000 {
				text := t.processAudioChunk(audioBuffer)
				if text != "" && t.options.Callback != nil {
					t.mic.Mute()
					(*t.options.Callback).Response(text)
					t.mic.Unmute()
				}
				// keep last 0.5 seconds for overlap
				keepSamples := 16000 / 2
				if len(audioBuffer) > keepSamples {
					audioBuffer = audioBuffer[len(audioBuffer)-keepSamples:]
				}
			}
		}
	}
}

func (t *Transcribe) processAudioChunk(audio []float32) string {
	// whisper expects float32 samples
	result, err := t.model.Process(audio, nil, nil)
	if err != nil {
		klog.V(1).Infof("whisper.Process failed. Err: %v\n", err)
		return ""
	}

	if len(result) > 0 {
		text := result[0].Text
		if text != "" {
			klog.V(3).Infof("whisper transcription: %s\n", text)
			return text
		}
	}

	return ""
}

func (t *Transcribe) Stop() error {
	klog.V(5).Infof("whisper Transcribe.Stop ENTER\n")
	if t.model != nil {
		t.model.Free()
	}
	if err := t.mic.Stop(); err != nil {
		klog.V(1).Infof("mic.Stop failed. Err: %v\n", err)
	}
	microphone.Teardown()
	return nil
} 
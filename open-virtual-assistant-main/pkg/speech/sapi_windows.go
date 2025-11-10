//go:build windows
// +build windows

package speech

import (
	"context"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
	klog "k8s.io/klog/v2"
)

// newSAPIClient returns a Client configured for Windows SAPI TTS
func newSAPIClient(_ context.Context, opts *SpeechOptions) (*Client, error) {
	return &Client{options: opts}, nil
}

func (sc *Client) playSAPI(_ context.Context, text string) error {
	klog.V(5).Infof("SAPI.Play ENTER\n")
	if err := ole.CoInitialize(0); err != nil {
		klog.V(1).Infof("CoInitialize failed. Err: %v\n", err)
		return err
	}
	defer ole.CoUninitialize()

	unknown, err := oleutil.CreateObject("SAPI.SpVoice")
	if err != nil {
		klog.V(1).Infof("CreateObject SAPI.SpVoice failed. Err: %v\n", err)
		return err
	}
	defer unknown.Release()

	voice, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		klog.V(1).Infof("QueryInterface failed. Err: %v\n", err)
		return err
	}
	defer voice.Release()

	_, err = oleutil.CallMethod(voice, "Speak", text)
	if err != nil {
		klog.V(1).Infof("SAPI Speak failed. Err: %v\n", err)
		return err
	}

	klog.V(4).Infof("SAPI.Play Succeeded\n")
	return nil
} 
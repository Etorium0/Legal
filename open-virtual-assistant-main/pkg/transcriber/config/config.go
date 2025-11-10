// Copyright 2023 The dvonthenen Open-Virtual-Assistant Authors. All Rights Reserved.
// Use of this source code is governed by an Apache-2.0 license that can be found in the LICENSE file.
// SPDX-License-Identifier: Apache-2.0

package config

import (
	interfaces "github.com/dvonthenen/open-virtual-assistant/pkg/transcriber/interfaces"
)

type TranscribeOptions struct {
	InputChannels int
	SamplingRate  int

	Callback *interfaces.ResponseCallback
}

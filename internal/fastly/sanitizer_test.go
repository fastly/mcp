package fastly

import (
	"encoding/json"
	"testing"
)

func TestSanitizeOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		enabled  bool
	}{
		{
			name:     "API token in output",
			input:    "Your API_TOKEN: abcdef1234567890abcdef1234567890",
			expected: "Your API_TOKEN: [REDACTED]",
			enabled:  true,
		},
		{
			name:     "Fastly token pattern",
			input:    "Token: 1234567890abcdef1234567890abcdef",
			expected: "Token: [REDACTED-TOKEN]",
			enabled:  true,
		},
		{
			name:     "Email address",
			input:    "Contact: user@example.com for support",
			expected: "Contact: u***@example.com for support",
			enabled:  true,
		},
		{
			name:     "IPv4 address",
			input:    "Server at 192.168.1.100 is ready",
			expected: "Server at [REDACTED-IP] is ready",
			enabled:  true,
		},
		{
			name:     "IPv6 address - full format",
			input:    "Server at 2001:0db8:85a3:0000:0000:8a2e:0370:7334 is ready",
			expected: "Server at [REDACTED-IPv6] is ready",
			enabled:  true,
		},
		{
			name:     "IPv6 address - compressed format",
			input:    "Connect to 2001:db8::8a2e:370:7334 for access",
			expected: "Connect to [REDACTED-IPv6] for access",
			enabled:  true,
		},
		{
			name:     "IPv6 address - compressed zeros",
			input:    "Service running on 2001:db8:0:0:1::1",
			expected: "Service running on [REDACTED-IPv6]",
			enabled:  true,
		},
		{
			name:     "IPv6 loopback address should not be redacted",
			input:    "Localhost is ::1",
			expected: "Localhost is ::1",
			enabled:  true,
		},
		{
			name:     "IPv6 link-local address should not be redacted",
			input:    "Link local address fe80::1234:5678:90ab:cdef",
			expected: "Link local address fe80::1234:5678:90ab:cdef",
			enabled:  true,
		},
		{
			name:     "IPv6 unique local address (fc00) should not be redacted",
			input:    "Private network fc00::1234:5678",
			expected: "Private network fc00::1234:5678",
			enabled:  true,
		},
		{
			name:     "IPv6 unique local address (fd) should not be redacted",
			input:    "Private network fd12:3456:789a:1::1",
			expected: "Private network fd12:3456:789a:1::1",
			enabled:  true,
		},
		{
			name:     "IPv6 multicast address should not be redacted",
			input:    "Multicast group ff02::1",
			expected: "Multicast group ff02::1",
			enabled:  true,
		},
		{
			name:     "Mixed IPv4 and IPv6 addresses",
			input:    "From 192.168.1.1 to 2001:db8::1 via fe80::1",
			expected: "From [REDACTED-IP] to [REDACTED-IPv6] via fe80::1",
			enabled:  true,
		},
		{
			name:     "URL with credentials",
			input:    "Connect to https://user:password@api.fastly.com",
			expected: "Connect to https://[REDACTED-CREDENTIALS]@...",
			enabled:  true,
		},
		{
			name:     "AWS access key",
			input:    "AWS Key: AKIAIOSFODNN7EXAMPLE",
			expected: "AWS Key: [REDACTED-AWS-ACCESS-KEY]",
			enabled:  true,
		},
		{
			name:     "SSH key with email",
			input:    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDExample user@example.com",
			expected: "ssh-rsa [REDACTED-SSH-KEY] u***@example.com",
			enabled:  true,
		},
		{
			name:     "No sanitization when disabled",
			input:    "API_TOKEN: secret123456789012345678901234567890",
			expected: "API_TOKEN: secret123456789012345678901234567890",
			enabled:  false,
		},
		{
			name:     "Multiple sensitive items",
			input:    "User john@example.com with token abcdef1234567890abcdef1234567890 from 10.0.0.1",
			expected: "User j***@example.com with token [REDACTED-TOKEN] from [REDACTED-IP]",
			enabled:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := SanitizeOptions{Enabled: tt.enabled}
			result := SanitizeOutput(tt.input, opts)
			if result != tt.expected {
				t.Errorf("SanitizeOutput() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSanitizeJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected interface{}
		enabled  bool
	}{
		{
			name: "JSON with password field",
			input: map[string]interface{}{
				"username": "john",
				"password": "secret123",
				"email":    "john@example.com",
			},
			expected: map[string]interface{}{
				"username": "john",
				"password": "[REDACTED]",
				"email":    "j***@example.com",
			},
			enabled: true,
		},
		{
			name: "Nested JSON with tokens",
			input: map[string]interface{}{
				"config": map[string]interface{}{
					"api_key":  "1234567890abcdef",
					"endpoint": "https://api.fastly.com",
				},
			},
			expected: map[string]interface{}{
				"config": map[string]interface{}{
					"api_key":  "[REDACTED]",
					"endpoint": "https://api.fastly.com",
				},
			},
			enabled: true,
		},
		{
			name: "Array of items",
			input: []interface{}{
				map[string]interface{}{
					"id":    "123",
					"token": "abcdef1234567890abcdef1234567890",
				},
				map[string]interface{}{
					"id":    "456",
					"token": "fedcba0987654321fedcba0987654321",
				},
			},
			expected: []interface{}{
				map[string]interface{}{
					"id":    "123",
					"token": "[REDACTED]",
				},
				map[string]interface{}{
					"id":    "456",
					"token": "[REDACTED]",
				},
			},
			enabled: true,
		},
		{
			name: "No sanitization when disabled",
			input: map[string]interface{}{
				"secret": "mysecret",
			},
			expected: map[string]interface{}{
				"secret": "mysecret",
			},
			enabled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := SanitizeOptions{Enabled: tt.enabled}
			result := SanitizeJSON(tt.input, opts)

			// Convert both to JSON for comparison
			expectedJSON, _ := json.Marshal(tt.expected)
			resultJSON, _ := json.Marshal(result)

			if string(resultJSON) != string(expectedJSON) {
				t.Errorf("SanitizeJSON() = %s, want %s", resultJSON, expectedJSON)
			}
		})
	}
}

func TestIsHexString(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"1234567890abcdef", true},
		{"ABCDEF123456789", true},
		{"ghijklmnop", false},
		{"123-456", false},
		{"", true}, // empty string is technically all hex
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := isHexString(tt.input)
			if result != tt.expected {
				t.Errorf("isHexString(%s) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestContainsSensitiveKey(t *testing.T) {
	tests := []struct {
		key      string
		expected bool
	}{
		{"password", true},
		{"user_password", true},
		{"api_key", true},
		{"secret_token", true},
		{"username", false},
		{"id", false},
		{"data", false},
		{"private_key", true},
		{"authorization", true},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			result := containsSensitiveKey(tt.key)
			if result != tt.expected {
				t.Errorf("containsSensitiveKey(%s) = %v, want %v", tt.key, result, tt.expected)
			}
		})
	}
}

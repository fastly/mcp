package crypto

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"testing"
	"time"
)

// TestFASTCorrectness verifies that the FAST cipher correctly encrypts and decrypts data
// while preserving format and properly handling tweaks
func TestFASTCorrectness(t *testing.T) {
	key := []byte("0123456789abcdef") // 16 bytes for AES-128

	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	testCases := []struct {
		name  string
		data  []byte
		tweak []byte
	}{
		{"single_byte", []byte{0x42}, nil},
		{"small_data", []byte("hello"), nil},
		{"medium_data", []byte("The quick brown fox jumps over the lazy dog"), nil},
		{"large_data", make([]byte, 128), nil},
		{"with_tweak", []byte("secret data"), []byte("domain1")},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test encryption/decryption
			encrypted := fast.Encrypt(tc.data, tc.tweak)

			// Verify format preservation
			if len(encrypted) != len(tc.data) {
				t.Errorf("Format not preserved: got %d bytes, expected %d", len(encrypted), len(tc.data))
			}

			// Verify encryption changed the data
			if bytes.Equal(encrypted, tc.data) {
				t.Error("Encryption did not change the data")
			}

			// Test decryption
			decrypted := fast.Decrypt(encrypted, tc.tweak)

			// Verify correct decryption
			if !bytes.Equal(decrypted, tc.data) {
				t.Errorf("Decryption failed: got %v, expected %v", decrypted, tc.data)
			}
		})
	}

	// Test tweak sensitivity - different tweaks must produce different ciphertexts
	// and decryption with wrong tweak must fail
	t.Run("tweak_sensitivity", func(t *testing.T) {
		data := []byte("sensitive information")
		tweak1 := []byte("context1")
		tweak2 := []byte("context2")

		encrypted1 := fast.Encrypt(data, tweak1)
		encrypted2 := fast.Encrypt(data, tweak2)

		if bytes.Equal(encrypted1, encrypted2) {
			t.Error("Different tweaks produced same ciphertext")
		}

		// Verify that decryption with wrong tweak produces incorrect plaintext
		wrongDecrypt := fast.Decrypt(encrypted1, tweak2)
		if bytes.Equal(wrongDecrypt, data) {
			t.Error("Decryption succeeded with wrong tweak")
		}
	})
}

// TestFASTDeterministic verifies that FAST encryption is deterministic:
// encrypting the same plaintext with the same key and tweak always produces
// the same ciphertext
func TestFASTDeterministic(t *testing.T) {
	key := []byte("0123456789abcdef")

	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	data := []byte("deterministic test data")
	tweak := []byte("tweak")

	// Encrypt the same data multiple times
	encrypted1 := fast.Encrypt(data, tweak)
	encrypted2 := fast.Encrypt(data, tweak)
	encrypted3 := fast.Encrypt(data, tweak)

	// All ciphertexts should be identical since FAST is deterministic
	if !bytes.Equal(encrypted1, encrypted2) || !bytes.Equal(encrypted2, encrypted3) {
		t.Error("FAST encryption is not deterministic")
	}
}

// TestFASTVariousSizes tests FAST encryption/decryption with various input sizes
func TestFASTVariousSizes(t *testing.T) {
	key := make([]byte, 16)
	if _, err := rand.Read(key); err != nil {
		t.Fatalf("Failed to generate random key: %v", err)
	}

	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	// Test a comprehensive range of sizes
	testSizes := []struct {
		name string
		size int
	}{
		// Small sizes
		{"1_byte", 1},
		{"2_bytes", 2},
		{"3_bytes", 3},
		{"4_bytes", 4},
		{"5_bytes", 5},
		{"7_bytes", 7},
		{"8_bytes", 8},

		// Power of 2 sizes
		{"16_bytes", 16},
		{"32_bytes", 32},
		{"64_bytes", 64},
		{"128_bytes", 128},
		{"256_bytes", 256},
		{"512_bytes", 512},
		{"1024_bytes", 1024},

		// Non-power of 2 sizes
		{"15_bytes", 15},
		{"17_bytes", 17},
		{"31_bytes", 31},
		{"33_bytes", 33},
		{"63_bytes", 63},
		{"65_bytes", 65},
		{"100_bytes", 100},
		{"255_bytes", 255},
		{"257_bytes", 257},
		{"500_bytes", 500},
		{"1000_bytes", 1000},

		// Prime number sizes
		{"11_bytes", 11},
		{"13_bytes", 13},
		{"23_bytes", 23},
		{"29_bytes", 29},
		{"37_bytes", 37},
		{"41_bytes", 41},
		{"53_bytes", 53},
		{"59_bytes", 59},
		{"61_bytes", 61},
		{"67_bytes", 67},
		{"71_bytes", 71},
		{"73_bytes", 73},
		{"79_bytes", 79},
		{"83_bytes", 83},
		{"89_bytes", 89},
		{"97_bytes", 97},

		// Larger sizes
		{"2048_bytes", 2048},
		{"4096_bytes", 4096},
		{"8192_bytes", 8192},
	}

	for _, tc := range testSizes {
		t.Run(tc.name, func(t *testing.T) {
			// Generate random plaintext
			plaintext := make([]byte, tc.size)
			if _, err := rand.Read(plaintext); err != nil {
				t.Fatalf("Failed to generate random plaintext: %v", err)
			}

			// Test without tweak
			t.Run("no_tweak", func(t *testing.T) {
				encrypted := fast.Encrypt(plaintext, nil)

				// Verify format preservation
				if len(encrypted) != tc.size {
					t.Errorf("Format not preserved: got %d bytes, expected %d", len(encrypted), tc.size)
				}

				// Verify encryption changed the data
				if bytes.Equal(encrypted, plaintext) {
					t.Error("Encryption did not change the data")
				}

				// Verify decryption
				decrypted := fast.Decrypt(encrypted, nil)
				if !bytes.Equal(decrypted, plaintext) {
					t.Errorf("Decryption failed for size %d", tc.size)
				}
			})

			// Test with tweak
			t.Run("with_tweak", func(t *testing.T) {
				tweak := []byte("test_tweak_12345")
				encrypted := fast.Encrypt(plaintext, tweak)

				// Verify format preservation
				if len(encrypted) != tc.size {
					t.Errorf("Format not preserved: got %d bytes, expected %d", len(encrypted), tc.size)
				}

				// Verify encryption changed the data
				if bytes.Equal(encrypted, plaintext) {
					t.Error("Encryption did not change the data")
				}

				// Verify decryption with correct tweak
				decrypted := fast.Decrypt(encrypted, tweak)
				if !bytes.Equal(decrypted, plaintext) {
					t.Errorf("Decryption failed for size %d with tweak", tc.size)
				}

				// Verify decryption with wrong tweak fails
				wrongTweak := []byte("wrong_tweak_54321")
				wrongDecrypted := fast.Decrypt(encrypted, wrongTweak)
				if bytes.Equal(wrongDecrypted, plaintext) {
					t.Errorf("Decryption succeeded with wrong tweak for size %d", tc.size)
				}
			})
		})
	}
}

// TestFASTSpecialCases tests FAST with special input patterns
func TestFASTSpecialCases(t *testing.T) {
	key := []byte("0123456789abcdef")
	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	testCases := []struct {
		name        string
		plaintext   []byte
		description string
	}{
		{
			name:        "all_zeros",
			plaintext:   bytes.Repeat([]byte{0x00}, 32),
			description: "All zero bytes",
		},
		{
			name:        "all_ones",
			plaintext:   bytes.Repeat([]byte{0xFF}, 32),
			description: "All 0xFF bytes",
		},
		{
			name:        "alternating_pattern",
			plaintext:   bytes.Repeat([]byte{0xAA, 0x55}, 16),
			description: "Alternating 0xAA and 0x55",
		},
		{
			name: "sequential_bytes",
			plaintext: func() []byte {
				b := make([]byte, 256)
				for i := range b {
					b[i] = byte(i)
				}
				return b
			}(),
			description: "Sequential bytes 0x00 to 0xFF",
		},
		{
			name:        "single_bit_set",
			plaintext:   func() []byte { b := make([]byte, 32); b[0] = 0x01; return b }(),
			description: "Only first bit set",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			encrypted := fast.Encrypt(tc.plaintext, nil)

			// Verify format preservation
			if len(encrypted) != len(tc.plaintext) {
				t.Errorf("%s: Format not preserved", tc.description)
			}

			// Verify encryption changed the data
			if bytes.Equal(encrypted, tc.plaintext) {
				t.Errorf("%s: Encryption did not change the data", tc.description)
			}

			// Verify decryption
			decrypted := fast.Decrypt(encrypted, nil)
			if !bytes.Equal(decrypted, tc.plaintext) {
				t.Errorf("%s: Decryption failed", tc.description)
			}

			// Check that encrypted data doesn't have obvious patterns
			// For example, all zeros shouldn't encrypt to all zeros
			if tc.name == "all_zeros" && isAllZeros(encrypted) {
				t.Errorf("All zeros encrypted to all zeros")
			}
			if tc.name == "all_ones" && isAllOnes(encrypted) {
				t.Errorf("All ones encrypted to all ones")
			}
		})
	}
}

// TestFASTRoundNumbers verifies the number of rounds for different input sizes
func TestFASTRoundNumbers(t *testing.T) {
	key := []byte("0123456789abcdef")
	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	testCases := []struct {
		size        int
		minRounds   int
		description string
	}{
		{1, 64, "Single byte"},
		{2, 64, "Two bytes"},
		{4, 64, "Four bytes"},
		{8, 64, "Eight bytes"},
		{16, 64, "16 bytes"},
		{32, 64, "32 bytes"},
		{33, 132, "33 bytes (>32, so 4*ell min)"},
		{64, 256, "64 bytes"},
		{128, 512, "128 bytes"},
		{256, 1024, "256 bytes"},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			rounds := fast.computeRounds(tc.size)

			// Verify minimum rounds
			if rounds < tc.minRounds {
				t.Errorf("Size %d: got %d rounds, expected at least %d", tc.size, rounds, tc.minRounds)
			}

			// Verify rounds is multiple of size
			if rounds%tc.size != 0 {
				t.Errorf("Size %d: rounds %d is not a multiple of size", tc.size, rounds)
			}

			t.Logf("Size %d: %d rounds (%.1f rounds per byte)", tc.size, rounds, float64(rounds)/float64(tc.size))
		})
	}
}

// TestFASTBranchDistances verifies branch distance calculations
func TestFASTBranchDistances(t *testing.T) {
	key := []byte("0123456789abcdef")
	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	testCases := []struct {
		size           int
		expectedW      int
		expectedWPrime int
	}{
		{1, 0, 1},     // Special case
		{2, 0, 1},     // Special case for ℓ=2
		{3, 1, 1},     // ceil(sqrt(3)) = 2, min(2, 3-2) = 1
		{4, 2, 1},     // ceil(sqrt(4)) = 2
		{5, 3, 2},     // ceil(sqrt(5)) = 3, min(3, 5-2) = 3
		{8, 3, 2},     // ceil(sqrt(8)) = 3
		{9, 3, 2},     // ceil(sqrt(9)) = 3
		{16, 4, 3},    // ceil(sqrt(16)) = 4
		{25, 5, 4},    // ceil(sqrt(25)) = 5
		{32, 6, 5},    // ceil(sqrt(32)) = 6
		{64, 8, 7},    // ceil(sqrt(64)) = 8
		{100, 10, 9},  // ceil(sqrt(100)) = 10
		{128, 12, 11}, // ceil(sqrt(128)) = 12, min(12, 126) = 12
		{256, 16, 15}, // ceil(sqrt(256)) = 16
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("size_%d", tc.size), func(t *testing.T) {
			w, wPrime := fast.computeBranchDistances(tc.size)
			if w != tc.expectedW || wPrime != tc.expectedWPrime {
				t.Errorf("Size %d: got w=%d, w'=%d, expected w=%d, w'=%d",
					tc.size, w, wPrime, tc.expectedW, tc.expectedWPrime)
			}
		})
	}
}

// TestFASTPerformance benchmarks FAST with different sizes
func TestFASTPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	key := []byte("0123456789abcdef")
	fast, err := NewFASTCipher(key)
	if err != nil {
		t.Fatalf("Failed to create FAST cipher: %v", err)
	}

	sizes := []int{16, 32, 64, 128, 256, 512, 1024, 4096}

	for _, size := range sizes {
		plaintext := make([]byte, size)
		if _, err := rand.Read(plaintext); err != nil {
			t.Fatalf("Failed to generate random plaintext: %v", err)
		}

		// Warm up
		for i := 0; i < 10; i++ {
			_ = fast.Encrypt(plaintext, nil)
		}

		// Measure encryption time
		start := time.Now()
		iterations := 1000
		for i := 0; i < iterations; i++ {
			_ = fast.Encrypt(plaintext, nil)
		}
		duration := time.Since(start)

		bytesPerSec := float64(size*iterations) / duration.Seconds()
		mbPerSec := bytesPerSec / (1024 * 1024)

		t.Logf("Size %d bytes: %.2f MB/s (%.2f µs per operation)",
			size, mbPerSec, float64(duration.Microseconds())/float64(iterations))
	}
}

// Helper functions
func isAllZeros(b []byte) bool {
	for _, v := range b {
		if v != 0 {
			return false
		}
	}
	return true
}

func isAllOnes(b []byte) bool {
	for _, v := range b {
		if v != 0xFF {
			return false
		}
	}
	return true
}

package crypto

import (
	"math/bits"
	"testing"
)

// TestFASTDiffusionAnalysis performs detailed analysis of diffusion properties
func TestFASTDiffusionAnalysis(t *testing.T) {
	tc, err := NewTokenCrypto(true)
	if err != nil {
		t.Fatalf("Failed to create TokenCrypto: %v", err)
	}

	t.Run("bit_diffusion_analysis", func(t *testing.T) {
		// Test diffusion for various input sizes
		testSizes := []int{8, 16, 32, 64, 128}

		for _, size := range testSizes {
			plaintext1 := make([]byte, size)
			for i := range plaintext1 {
				plaintext1[i] = byte(i)
			}

			// Test flipping each bit position
			var (
				totalDiffBits = 0
				minDiffBits   = size * 8
				maxDiffBits   = 0
			)

			for bytePos := 0; bytePos < size; bytePos++ {
				for bitPos := 0; bitPos < 8; bitPos++ {
					plaintext2 := make([]byte, size)
					copy(plaintext2, plaintext1)
					plaintext2[bytePos] ^= 1 << bitPos // Flip one bit

					encrypted1 := tc.fpeEncrypt(plaintext1)
					encrypted2 := tc.fpeEncrypt(plaintext2)

					diffBits := countDifferentBits(encrypted1, encrypted2)
					totalDiffBits += diffBits

					if diffBits < minDiffBits {
						minDiffBits = diffBits
					}
					if diffBits > maxDiffBits {
						maxDiffBits = diffBits
					}
				}
			}

			const bitsPerByte = 8
			totalBits := size * bitsPerByte
			avgDiffBits := float64(totalDiffBits) / float64(totalBits)
			expectedDiffBits := float64(totalBits) / 2 // Ideal: 50% of bits differ

			t.Logf("Size %d bytes: avg diff bits: %.2f (expected: %.2f), min: %d, max: %d",
				size, avgDiffBits, expectedDiffBits, minDiffBits, maxDiffBits)

			// For good diffusion after 64 rounds, we expect close to 50% bit differences
			diffusionRatio := avgDiffBits / expectedDiffBits
			if diffusionRatio < 0.4 || diffusionRatio > 1.6 {
				t.Errorf("Poor diffusion for size %d: ratio %.2f (expected close to 1.0)", size, diffusionRatio)
			}
		}
	})

	t.Run("avalanche_test", func(t *testing.T) {
		// Test avalanche effect: single bit change should affect many output bits
		sizes := []int{16, 32, 64}

		for _, size := range sizes {
			plaintext := make([]byte, size)
			for i := range plaintext {
				plaintext[i] = byte(i)
			}

			// Test changing first byte
			modifiedPlaintext := make([]byte, size)
			copy(modifiedPlaintext, plaintext)
			modifiedPlaintext[0] ^= 1

			encrypted1 := tc.fpeEncrypt(plaintext)
			encrypted2 := tc.fpeEncrypt(modifiedPlaintext)

			// Analyze byte-level differences
			diffBytes := 0
			for i := range encrypted1 {
				if encrypted1[i] != encrypted2[i] {
					diffBytes++
				}
			}

			diffRatio := float64(diffBytes) / float64(size)
			t.Logf("Size %d: %d/%d bytes differ (%.2f%%)", size, diffBytes, size, diffRatio*100)

			// For good avalanche, we expect most bytes to be affected
			if diffRatio < 0.5 {
				t.Errorf("Poor avalanche effect for size %d: only %.2f%% bytes affected", size, diffRatio*100)
			}
		}
	})

	t.Run("position_independence", func(t *testing.T) {
		// Test that changes at different positions have similar diffusion
		const size = 32
		plaintext := make([]byte, size)
		for i := range plaintext {
			plaintext[i] = byte(i * 7)
		}

		positions := []int{0, size / 4, size / 2, 3 * size / 4, size - 1}

		for _, pos := range positions {
			modified := make([]byte, size)
			copy(modified, plaintext)
			modified[pos] ^= 0xFF // Flip all bits at position

			encrypted1 := tc.fpeEncrypt(plaintext)
			encrypted2 := tc.fpeEncrypt(modified)

			diffBits := countDifferentBits(encrypted1, encrypted2)
			diffRatio := float64(diffBits) / float64(size*8)

			t.Logf("Position %d: %d bits differ (%.2f%%)", pos, diffBits, diffRatio*100)

			// Each position should show good diffusion
			if diffRatio < 0.3 {
				t.Errorf("Poor diffusion for change at position %d: only %.2f%% bits affected", pos, diffRatio*100)
			}
		}
	})
}

// countDifferentBits counts the number of differing bits between two byte slices
func countDifferentBits(a, b []byte) int {
	if len(a) != len(b) {
		return -1
	}

	diffBits := 0
	for i := range a {
		xor := a[i] ^ b[i]
		// Count set bits using math/bits package
		diffBits += bits.OnesCount8(xor)
	}
	return diffBits
}

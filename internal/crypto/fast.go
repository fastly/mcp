// Package crypto provides the FAST algorithm implementation for format-preserving encryption.
// Based on: "FAST: Secure and High Performance Format-Preserving Encryption and Tokenization"
// https://eprint.iacr.org/2021/1171.pdf

package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/subtle"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"sync"
)

// Constants for FAST algorithm
const (
	// MaxDataSize is the maximum size of data that can be encrypted/decrypted
	MaxDataSize = 1024 * 1024 // 1MB limit for safety
)

// bufferPool manages a pool of byte slices to reduce allocations
var bufferPool = sync.Pool{
	New: func() interface{} {
		b := make([]byte, 16) // AES block size
		return &b
	},
}

// Errors
var (
	ErrInvalidKeySize = errors.New("invalid key size: must be 16, 24, or 32 bytes")
)

// FASTCipher implements the FAST format-preserving encryption algorithm
type FASTCipher struct {
	cipher       cipher.Block
	m            int // pool size (number of S-boxes)
	sboxPool     [][]byte
	sboxPoolOnce sync.Once
	invSboxPool  [][]byte
	// Pre-allocated buffers for AES-CMAC to reduce allocations
	cmacK1   []byte
	cmacK2   []byte
	cmacOnce sync.Once
	// Cache for index sequence generation ciphers
	indexCipherCache map[string]cipher.Block
	indexCacheMu     sync.RWMutex
	// Cache for index sequences when tweak is nil
	noTweakSeqCache map[string][]byte
	noTweakSeqMu    sync.RWMutex
}

// leftShiftInPlace performs a left shift by one bit in-place to avoid allocation
func leftShiftInPlace(dst, src []byte) {
	carry := byte(0)
	for i := len(src) - 1; i >= 0; i-- {
		dst[i] = src[i]<<1 | carry
		carry = src[i] >> 7
	}
}

// initCMACKeys initializes the CMAC subkeys K1 and K2 once
func (f *FASTCipher) initCMACKeys() {
	f.cmacOnce.Do(func() {
		blockSize := f.cipher.BlockSize()
		f.cmacK1 = make([]byte, blockSize)
		f.cmacK2 = make([]byte, blockSize)

		// Generate subkeys K1 and K2
		L := make([]byte, blockSize)
		f.cipher.Encrypt(L, L) // L = AES(K, 0^128)

		leftShiftInPlace(f.cmacK1, L)
		if L[0]&0x80 != 0 {
			f.cmacK1[blockSize-1] ^= 0x87 // Rb for AES-128
		}

		leftShiftInPlace(f.cmacK2, f.cmacK1)
		if f.cmacK1[0]&0x80 != 0 {
			f.cmacK2[blockSize-1] ^= 0x87
		}
	})
}

// aesCMACOptimized implements AES-CMAC with pre-computed keys
func (f *FASTCipher) aesCMACOptimized(message []byte) []byte {
	f.initCMACKeys()
	blockSize := f.cipher.BlockSize()

	// Determine number of blocks
	msgLen := len(message)
	numBlocks := (msgLen + blockSize - 1) / blockSize
	if numBlocks == 0 {
		numBlocks = 1
	}

	// Get buffers from pool
	macPtr := bufferPool.Get().(*[]byte)
	mac := (*macPtr)[:blockSize]
	defer bufferPool.Put(macPtr)

	// Clear the buffer
	clear(mac)

	// Process all blocks except the last
	for i := 0; i < numBlocks-1; i++ {
		for j := 0; j < blockSize; j++ {
			mac[j] ^= message[i*blockSize+j]
		}
		f.cipher.Encrypt(mac, mac)
	}

	// Process last block - get another buffer from pool
	lastBlockPtr := bufferPool.Get().(*[]byte)
	lastBlock := (*lastBlockPtr)[:blockSize]
	defer bufferPool.Put(lastBlockPtr)

	// Clear the buffer
	clear(lastBlock)
	lastBlockComplete := msgLen > 0 && msgLen%blockSize == 0

	if lastBlockComplete {
		// Complete block: XOR with K1
		copy(lastBlock, message[(numBlocks-1)*blockSize:])
		subtle.XORBytes(lastBlock, lastBlock, f.cmacK1)
	} else {
		// Incomplete block: pad and XOR with K2
		remaining := msgLen % blockSize
		if msgLen > 0 {
			copy(lastBlock, message[(numBlocks-1)*blockSize:])
		}
		lastBlock[remaining] = 0x80 // 10* padding
		subtle.XORBytes(lastBlock, lastBlock, f.cmacK2)
	}

	// Final MAC computation
	subtle.XORBytes(mac, mac, lastBlock)
	f.cipher.Encrypt(mac, mac)

	// Return a copy since mac is from the pool
	result := make([]byte, blockSize)
	copy(result, mac)
	return result
}

// lemireRandomIndex returns an unbiased random index in [0, max) using Lemire's method
func lemireRandomIndex(rng func() uint32, max int) int {
	for {
		r := rng()
		prod := uint64(r) * uint64(max)
		if uint32(prod) >= uint32(prod%uint64(max)) {
			return int(prod >> 32)
		}
	}
}

// NewFASTCipher creates a new FAST cipher instance with the given AES key.
// The key must be 16, 24, or 32 bytes for AES-128, AES-192, or AES-256 respectively.
func NewFASTCipher(key []byte) (*FASTCipher, error) {
	// Validate key size
	switch len(key) {
	case 16, 24, 32:
		// Valid AES key sizes
	default:
		return nil, ErrInvalidKeySize
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	return &FASTCipher{
		cipher: block,
		m:      256, // Pool size (number of S-boxes) - standard is 256 for byte alphabet
	}, nil
}

// Encrypt performs FAST format-preserving encryption on the input data.
// The output has the same length as the input. The optional tweak parameter
// provides domain separation - different tweaks produce different ciphertexts
// for the same plaintext.
//
// Returns nil if the cipher is nil or data exceeds MaxDataSize.
func (f *FASTCipher) Encrypt(data []byte, tweak []byte) []byte {
	if f == nil || f.cipher == nil {
		return nil
	}

	if len(data) == 0 {
		return data
	}

	if len(data) > MaxDataSize {
		return nil
	}

	// For 2-byte inputs, use a simple substitution cipher approach
	// The FAST construction with w=0 doesn't provide unique decryption for ell=2
	if len(data) == 2 {
		return f.encrypt2Byte(data, tweak)
	}

	// FAST parameters for byte-oriented data
	ell := len(data)
	n := f.computeRounds(ell)
	w, wPrime := f.computeBranchDistances(ell)

	// Setup phase 1: Generate S-box pool (independent of tweak)
	sboxes := f.getSBoxPool()

	// Setup phase 2: Generate index sequence
	seq := f.generateIndexSequence(n, ell, w, wPrime, tweak)

	// Core encryption - use workspace to avoid repeated allocations
	state := make([]byte, ell)
	copy(state, data)

	// Pre-allocate workspace for forwardLayer to avoid allocations in hot loop
	workspace := make([]byte, ell)

	// Apply all rounds at once
	result := f.forwardLayerAllRounds(state, workspace, sboxes, seq, n, w, wPrime)

	return result
}

// Decrypt performs FAST format-preserving decryption on the input data.
// The output has the same length as the input. The same tweak used for
// encryption must be provided for successful decryption.
//
// Returns nil if the cipher is nil or data exceeds MaxDataSize.
func (f *FASTCipher) Decrypt(data []byte, tweak []byte) []byte {
	if f == nil || f.cipher == nil {
		return nil
	}

	if len(data) == 0 {
		return data
	}

	if len(data) > MaxDataSize {
		return nil
	}

	// For 2-byte inputs, use a simple substitution cipher approach
	if len(data) == 2 {
		return f.decrypt2Byte(data, tweak)
	}

	// FAST parameters for byte-oriented data
	ell := len(data)
	n := f.computeRounds(ell)
	w, wPrime := f.computeBranchDistances(ell)

	// Setup phases
	sboxes := f.getSBoxPool()
	seq := f.generateIndexSequence(n, ell, w, wPrime, tweak)

	// Core decryption (reverse order) - use workspace to avoid repeated allocations
	state := make([]byte, ell)
	copy(state, data)

	// Pre-allocate workspace for inverseLayer to avoid allocations in hot loop
	workspace := make([]byte, ell)

	// Apply all rounds at once (in reverse)
	result := f.inverseLayerAllRounds(state, workspace, sboxes, seq, n, w, wPrime)

	return result
}

// forwardLayerAllRounds implements the E_S[i] operation for all n rounds
// This optimized version uses specialized implementations for common sizes.
func (f *FASTCipher) forwardLayerAllRounds(x, workspace []byte, sboxes [][]byte, seq []byte, n, w, wPrime int) []byte {
	ell := len(x)

	// Special case: single element
	if ell == 1 {
		// Apply S-box for each round
		for j := 0; j < n; j++ {
			x[0] = sboxes[seq[j]][x[0]]
		}
		return x
	}

	// Use specialized implementations for common power-of-2 sizes
	switch ell {
	case 16:
		return f.forwardLayerPowerOf2Specialized(x, workspace, sboxes, seq, n, 16, 15, 4, 3)
	case 32:
		return f.forwardLayerPowerOf2Specialized(x, workspace, sboxes, seq, n, 32, 31, 6, 5)
	case 64:
		return f.forwardLayerPowerOf2Unrolled(x, workspace, sboxes, seq, n, 64, 63, 8, 7, 2)
	case 128:
		return f.forwardLayerPowerOf2Unrolled(x, workspace, sboxes, seq, n, 128, 127, 12, 11, 4)
	case 256:
		return f.forwardLayerPowerOf2Specialized(x, workspace, sboxes, seq, n, 256, 255, 16, 15)
	case 512:
		return f.forwardLayerPowerOf2Specialized(x, workspace, sboxes, seq, n, 512, 511, 23, 22)
	case 1024:
		return f.forwardLayerPowerOf2Unrolled(x, workspace, sboxes, seq, n, 1024, 1023, 32, 31, 4)
	default:
		// Check if it's a power of 2
		if ell&(ell-1) == 0 {
			mask := ell - 1
			return f.forwardLayerPowerOf2Generic(x, workspace, sboxes, seq, n, ell, mask, w, wPrime)
		}
		// Fall back to general implementation
		return f.forwardLayerGeneral(x, workspace, sboxes, seq, n, w, wPrime)
	}
}

// forwardLayerPowerOf2Specialized is optimized for specific power-of-2 sizes
func (f *FASTCipher) forwardLayerPowerOf2Specialized(x, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime int) []byte {
	// Copy initial state to workspace
	copy(workspace, x)

	// Use masking for circular indexing
	startIdx := 0

	for j := 0; j < n; j++ {
		sbox := sboxes[seq[j]]

		// Use bitwise AND for fast modulo with power-of-2
		firstIdx := startIdx
		mixIdx := (startIdx - wPrime) & mask
		wIdx := (startIdx + w) & mask

		// Core operation
		t := workspace[firstIdx] + workspace[mixIdx]
		u := sbox[t]
		v := sbox[u-workspace[wIdx]]

		workspace[startIdx] = v
		startIdx = (startIdx + 1) & mask
	}

	// Copy final result back
	if startIdx == 0 {
		copy(x, workspace)
	} else {
		copy(x, workspace[startIdx:])
		copy(x[ell-startIdx:], workspace[:startIdx])
	}
	return x
}

// forwardLayerPowerOf2Unrolled is optimized with loop unrolling for better performance
func (f *FASTCipher) forwardLayerPowerOf2Unrolled(x, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime, unroll int) []byte {
	// Copy initial state to workspace
	copy(workspace, x)

	// Use masking for circular indexing
	startIdx := 0

	// Process rounds with unrolling
	for j := 0; j < n; j += unroll {
		if unroll == 2 {
			sbox0 := sboxes[seq[j]]
			sbox1 := sboxes[seq[j+1]]

			// Round 0
			idx0 := startIdx
			t0 := workspace[idx0] + workspace[(idx0-wPrime)&mask]
			u0 := sbox0[t0]
			workspace[idx0] = sbox0[u0-workspace[(idx0+w)&mask]]

			// Round 1
			idx1 := (idx0 + 1) & mask
			t1 := workspace[idx1] + workspace[(idx1-wPrime)&mask]
			u1 := sbox1[t1]
			workspace[idx1] = sbox1[u1-workspace[(idx1+w)&mask]]

			startIdx = (idx1 + 1) & mask
		} else { // unroll == 4
			sbox0 := sboxes[seq[j]]
			sbox1 := sboxes[seq[j+1]]
			sbox2 := sboxes[seq[j+2]]
			sbox3 := sboxes[seq[j+3]]

			// Round 0
			idx0 := startIdx
			t0 := workspace[idx0] + workspace[(idx0-wPrime)&mask]
			u0 := sbox0[t0]
			workspace[idx0] = sbox0[u0-workspace[(idx0+w)&mask]]

			// Round 1
			idx1 := (idx0 + 1) & mask
			t1 := workspace[idx1] + workspace[(idx1-wPrime)&mask]
			u1 := sbox1[t1]
			workspace[idx1] = sbox1[u1-workspace[(idx1+w)&mask]]

			// Round 2
			idx2 := (idx1 + 1) & mask
			t2 := workspace[idx2] + workspace[(idx2-wPrime)&mask]
			u2 := sbox2[t2]
			workspace[idx2] = sbox2[u2-workspace[(idx2+w)&mask]]

			// Round 3
			idx3 := (idx2 + 1) & mask
			t3 := workspace[idx3] + workspace[(idx3-wPrime)&mask]
			u3 := sbox3[t3]
			workspace[idx3] = sbox3[u3-workspace[(idx3+w)&mask]]

			startIdx = (idx3 + 1) & mask
		}
	}

	// Copy final result back
	if startIdx == 0 {
		copy(x, workspace)
	} else {
		copy(x, workspace[startIdx:])
		copy(x[ell-startIdx:], workspace[:startIdx])
	}
	return x
}

// forwardLayerPowerOf2Generic handles any power-of-2 size
func (f *FASTCipher) forwardLayerPowerOf2Generic(x, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime int) []byte {
	// Copy initial state to workspace
	copy(workspace, x)

	// Pre-compute conditions
	hasMixingPartnerWPrime := ell-wPrime >= 0
	hasMixingPartnerW := w < ell

	// Use masking for circular indexing
	startIdx := 0

	for j := 0; j < n; j++ {
		sbox := sboxes[seq[j]]

		// Use bitwise AND for modulo with power-of-2
		firstIdx := startIdx
		mixIdx := (startIdx + ell - wPrime) & mask
		wIdx := (startIdx + w) & mask

		// Step 1: Compute mixing value
		var t byte
		if hasMixingPartnerWPrime {
			t = workspace[firstIdx] + workspace[mixIdx]
		} else {
			t = workspace[firstIdx]
		}

		// Step 2: First S-box lookup
		u := sbox[t]

		// Step 3: Second S-box lookup
		var v byte
		if hasMixingPartnerW {
			v = sbox[u-workspace[wIdx]]
		} else {
			v = sbox[u]
		}

		// Step 4: Update circular buffer
		workspace[startIdx] = v
		startIdx = (startIdx + 1) & mask
	}

	// Copy final result back
	if startIdx == 0 {
		copy(x, workspace)
	} else {
		copy(x, workspace[startIdx:])
		copy(x[ell-startIdx:], workspace[:startIdx])
	}
	return x
}

// forwardLayerGeneral handles non-power-of-2 sizes without modulo operations
func (f *FASTCipher) forwardLayerGeneral(x, workspace []byte, sboxes [][]byte, seq []byte, n, w, wPrime int) []byte {
	ell := len(x)

	// Copy initial state to workspace
	copy(workspace, x)

	// Pre-compute conditions
	hasMixingPartnerWPrime := ell-wPrime >= 0
	hasMixingPartnerW := w < ell

	// Process rounds without modulo by handling wraparound explicitly
	pos := 0
	for round := 0; round < n; round++ {
		sbox := sboxes[seq[round]]

		// Calculate indices with explicit wraparound
		firstIdx := pos
		mixIdx := pos - wPrime
		if mixIdx < 0 {
			mixIdx += ell
		}
		wIdx := pos + w
		if wIdx >= ell {
			wIdx -= ell
		}

		// Step 1: Compute mixing value
		var t byte
		if hasMixingPartnerWPrime {
			t = workspace[firstIdx] + workspace[mixIdx]
		} else {
			t = workspace[firstIdx]
		}

		// Step 2: First S-box lookup
		u := sbox[t]

		// Step 3: Second S-box lookup
		var v byte
		if hasMixingPartnerW {
			v = sbox[u-workspace[wIdx]]
		} else {
			v = sbox[u]
		}

		// Step 4: Store result and advance position
		workspace[pos] = v
		pos++
		if pos >= ell {
			pos = 0
		}
	}

	// Copy final result back with correct ordering
	if pos == 0 {
		copy(x, workspace)
	} else {
		// Reorder from circular buffer
		copy(x, workspace[pos:])
		copy(x[ell-pos:], workspace[:pos])
	}

	return x
}

// inverseLayerAllRounds implements the D_S[i] operation for all n rounds (in reverse)
// This optimized version uses specialized implementations for common sizes.
func (f *FASTCipher) inverseLayerAllRounds(y, workspace []byte, sboxes [][]byte, seq []byte, n, w, wPrime int) []byte {
	ell := len(y)

	// Special case: single element
	if ell == 1 {
		// Apply inverse S-box for each round in reverse
		for j := n - 1; j >= 0; j-- {
			y[0] = f.invSboxPool[seq[j]][y[0]]
		}
		return y
	}

	// Use specialized implementations for common power-of-2 sizes
	switch ell {
	case 16:
		return f.inverseLayerPowerOf2Specialized(y, workspace, sboxes, seq, n, 16, 15, 4, 3)
	case 32:
		return f.inverseLayerPowerOf2Specialized(y, workspace, sboxes, seq, n, 32, 31, 6, 5)
	case 64:
		return f.inverseLayerPowerOf2Unrolled(y, workspace, sboxes, seq, n, 64, 63, 8, 7, 2)
	case 128:
		return f.inverseLayerPowerOf2Unrolled(y, workspace, sboxes, seq, n, 128, 127, 12, 11, 4)
	case 256:
		return f.inverseLayerPowerOf2Specialized(y, workspace, sboxes, seq, n, 256, 255, 16, 15)
	case 512:
		return f.inverseLayerPowerOf2Specialized(y, workspace, sboxes, seq, n, 512, 511, 23, 22)
	case 1024:
		return f.inverseLayerPowerOf2Unrolled(y, workspace, sboxes, seq, n, 1024, 1023, 32, 31, 4)
	default:
		// Check if it's a power of 2
		if ell&(ell-1) == 0 {
			mask := ell - 1
			return f.inverseLayerPowerOf2Generic(y, workspace, sboxes, seq, n, ell, mask, w, wPrime)
		}
		// Fall back to general implementation
		return f.inverseLayerGeneral(y, workspace, sboxes, seq, n, w, wPrime)
	}
}

// inverseLayerPowerOf2Specialized is optimized for specific power-of-2 sizes
func (f *FASTCipher) inverseLayerPowerOf2Specialized(y, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime int) []byte {
	// Copy initial state to workspace
	copy(workspace, y)

	// Pre-compute conditions
	hasMixingPartnerW := w < ell
	hasMixingPartnerWPrime := ell-wPrime > 0
	isSpecialCaseW0 := w == 0 && hasMixingPartnerW

	// Start with circular index at 0 (matching forward operation's final state)
	endIdx := 0

	// Process all rounds in reverse
	for j := n - 1; j >= 0; j-- {
		sboxIdx := seq[j]
		sbox := sboxes[sboxIdx]
		invSbox := f.invSboxPool[sboxIdx]

		// Move endIdx backward using masking
		endIdx = (endIdx - 1) & mask

		// Extract v from current position
		v := workspace[endIdx]

		if isSpecialCaseW0 {
			// Special case for w=0
			firstIdx := endIdx
			secondIdx := (endIdx + 1) & mask

			// Try all possible x[0] values
			found := false
			for x0 := 0; x0 < 256; x0++ {
				t := byte(x0) + workspace[secondIdx]
				u := sbox[t]
				if sbox[u-byte(x0)] == v {
					workspace[firstIdx] = byte(x0)
					found = true
					break
				}
			}
			if !found {
				workspace[firstIdx] = 0
			}
		} else {
			// Normal case
			var u byte
			if hasMixingPartnerW {
				wIdx := (endIdx + w) & mask
				u = invSbox[v] + workspace[wIdx]
			} else {
				u = invSbox[v]
			}

			t := invSbox[u]

			if hasMixingPartnerWPrime {
				mixIdx := (endIdx - wPrime) & mask
				workspace[endIdx] = t - workspace[mixIdx]
			} else {
				workspace[endIdx] = t
			}
		}
	}

	// Copy final result back with correct ordering
	if endIdx == 0 {
		copy(y, workspace)
	} else {
		copy(y, workspace[endIdx:])
		copy(y[ell-endIdx:], workspace[:endIdx])
	}
	return y
}

// inverseLayerPowerOf2Unrolled is optimized with loop unrolling for better performance
func (f *FASTCipher) inverseLayerPowerOf2Unrolled(y, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime, unroll int) []byte {
	// Copy initial state to workspace
	copy(workspace, y)

	// Pre-compute conditions
	hasMixingPartnerW := w < ell
	hasMixingPartnerWPrime := ell-wPrime > 0

	// Start with circular index at 0
	endIdx := 0

	// Process rounds with unrolling
	for j := n - unroll; j >= 0; j -= unroll {
		if unroll == 2 {
			invSbox1 := f.invSboxPool[seq[j+1]]
			invSbox0 := f.invSboxPool[seq[j]]

			// Round j+1 (second round in reverse)
			idx1 := (endIdx - 1) & mask
			v1 := workspace[idx1]
			var u1 byte
			if hasMixingPartnerW {
				u1 = invSbox1[v1] + workspace[(idx1+w)&mask]
			} else {
				u1 = invSbox1[v1]
			}
			t1 := invSbox1[u1]
			if hasMixingPartnerWPrime {
				workspace[idx1] = t1 - workspace[(idx1-wPrime)&mask]
			} else {
				workspace[idx1] = t1
			}

			// Round j (first round in reverse)
			idx0 := (idx1 - 1) & mask
			v0 := workspace[idx0]
			var u0 byte
			if hasMixingPartnerW {
				u0 = invSbox0[v0] + workspace[(idx0+w)&mask]
			} else {
				u0 = invSbox0[v0]
			}
			t0 := invSbox0[u0]
			if hasMixingPartnerWPrime {
				workspace[idx0] = t0 - workspace[(idx0-wPrime)&mask]
			} else {
				workspace[idx0] = t0
			}

			endIdx = idx0
		} else { // unroll == 4
			invSbox3 := f.invSboxPool[seq[j+3]]
			invSbox2 := f.invSboxPool[seq[j+2]]
			invSbox1 := f.invSboxPool[seq[j+1]]
			invSbox0 := f.invSboxPool[seq[j]]

			// Round j+3
			idx3 := (endIdx - 1) & mask
			v3 := workspace[idx3]
			var u3 byte
			if hasMixingPartnerW {
				u3 = invSbox3[v3] + workspace[(idx3+w)&mask]
			} else {
				u3 = invSbox3[v3]
			}
			t3 := invSbox3[u3]
			if hasMixingPartnerWPrime {
				workspace[idx3] = t3 - workspace[(idx3-wPrime)&mask]
			} else {
				workspace[idx3] = t3
			}

			// Round j+2
			idx2 := (idx3 - 1) & mask
			v2 := workspace[idx2]
			var u2 byte
			if hasMixingPartnerW {
				u2 = invSbox2[v2] + workspace[(idx2+w)&mask]
			} else {
				u2 = invSbox2[v2]
			}
			t2 := invSbox2[u2]
			if hasMixingPartnerWPrime {
				workspace[idx2] = t2 - workspace[(idx2-wPrime)&mask]
			} else {
				workspace[idx2] = t2
			}

			// Round j+1
			idx1 := (idx2 - 1) & mask
			v1 := workspace[idx1]
			var u1 byte
			if hasMixingPartnerW {
				u1 = invSbox1[v1] + workspace[(idx1+w)&mask]
			} else {
				u1 = invSbox1[v1]
			}
			t1 := invSbox1[u1]
			if hasMixingPartnerWPrime {
				workspace[idx1] = t1 - workspace[(idx1-wPrime)&mask]
			} else {
				workspace[idx1] = t1
			}

			// Round j
			idx0 := (idx1 - 1) & mask
			v0 := workspace[idx0]
			var u0 byte
			if hasMixingPartnerW {
				u0 = invSbox0[v0] + workspace[(idx0+w)&mask]
			} else {
				u0 = invSbox0[v0]
			}
			t0 := invSbox0[u0]
			if hasMixingPartnerWPrime {
				workspace[idx0] = t0 - workspace[(idx0-wPrime)&mask]
			} else {
				workspace[idx0] = t0
			}

			endIdx = idx0
		}
	}

	// Copy final result back with correct ordering
	if endIdx == 0 {
		copy(y, workspace)
	} else {
		copy(y, workspace[endIdx:])
		copy(y[ell-endIdx:], workspace[:endIdx])
	}
	return y
}

// inverseLayerPowerOf2Generic handles any power-of-2 size
func (f *FASTCipher) inverseLayerPowerOf2Generic(y, workspace []byte, sboxes [][]byte, seq []byte, n, ell, mask, w, wPrime int) []byte {
	// Copy initial state to workspace
	copy(workspace, y)

	// Pre-compute conditions
	hasMixingPartnerW := w < ell
	hasMixingPartnerWPrime := ell-wPrime > 0
	isSpecialCaseW0 := w == 0 && hasMixingPartnerW

	// Start with circular index at 0
	endIdx := 0

	// Process all rounds in reverse
	for j := n - 1; j >= 0; j-- {
		sboxIdx := seq[j]
		sbox := sboxes[sboxIdx]
		invSbox := f.invSboxPool[sboxIdx]

		// Move endIdx backward using masking
		endIdx = (endIdx + ell - 1) & mask

		// Extract v from current position
		v := workspace[endIdx]

		if isSpecialCaseW0 {
			// Special case for w=0
			firstIdx := endIdx
			secondIdx := (endIdx + 1) & mask

			// Try all possible x[0] values
			found := false
			for x0 := 0; x0 < 256; x0++ {
				t := byte(x0) + workspace[secondIdx]
				u := sbox[t]
				if sbox[u-byte(x0)] == v {
					workspace[firstIdx] = byte(x0)
					found = true
					break
				}
			}
			if !found {
				workspace[firstIdx] = 0
			}
		} else {
			// Normal case
			var u byte
			if hasMixingPartnerW {
				wIdx := (endIdx + w) & mask
				u = invSbox[v] + workspace[wIdx]
			} else {
				u = invSbox[v]
			}

			t := invSbox[u]

			if hasMixingPartnerWPrime {
				mixIdx := (endIdx + ell - wPrime) & mask
				workspace[endIdx] = t - workspace[mixIdx]
			} else {
				workspace[endIdx] = t
			}
		}
	}

	// Copy final result back with correct ordering
	if endIdx == 0 {
		copy(y, workspace)
	} else {
		// Reorder data from circular buffer
		for i := 0; i < ell; i++ {
			y[i] = workspace[(endIdx+i)&mask]
		}
	}
	return y
}

// inverseLayerGeneral handles non-power-of-2 sizes without modulo operations
func (f *FASTCipher) inverseLayerGeneral(y, workspace []byte, sboxes [][]byte, seq []byte, n, w, wPrime int) []byte {
	ell := len(y)

	// Copy initial state to workspace
	copy(workspace, y)

	// Pre-compute conditions
	hasMixingPartnerW := w < ell
	hasMixingPartnerWPrime := ell-wPrime > 0
	isSpecialCaseW0 := w == 0 && hasMixingPartnerW

	// Start with circular index at 0
	endIdx := 0

	// Process all rounds in reverse
	for j := n - 1; j >= 0; j-- {
		sboxIdx := seq[j]
		sbox := sboxes[sboxIdx]
		invSbox := f.invSboxPool[sboxIdx]

		// Move endIdx backward
		endIdx--
		if endIdx < 0 {
			endIdx = ell - 1
		}

		// Extract v from current position
		v := workspace[endIdx]

		if isSpecialCaseW0 {
			// Special case for w=0
			firstIdx := endIdx
			secondIdx := endIdx + 1
			if secondIdx >= ell {
				secondIdx = 0
			}

			// Try all possible x[0] values
			found := false
			for x0 := 0; x0 < 256; x0++ {
				t := byte(x0) + workspace[secondIdx]
				u := sbox[t]
				if sbox[u-byte(x0)] == v {
					workspace[firstIdx] = byte(x0)
					found = true
					break
				}
			}
			if !found {
				workspace[firstIdx] = 0
			}
		} else {
			// Normal case
			var u byte
			if hasMixingPartnerW {
				wIdx := endIdx + w
				if wIdx >= ell {
					wIdx -= ell
				}
				u = invSbox[v] + workspace[wIdx]
			} else {
				u = invSbox[v]
			}

			t := invSbox[u]

			if hasMixingPartnerWPrime {
				mixIdx := endIdx - wPrime
				if mixIdx < 0 {
					mixIdx += ell
				}
				workspace[endIdx] = t - workspace[mixIdx]
			} else {
				workspace[endIdx] = t
			}
		}
	}

	// Copy final result back with correct ordering
	if endIdx == 0 {
		copy(y, workspace)
	} else {
		// Reorder data from circular buffer
		for i := 0; i < ell; i++ {
			idx := endIdx + i
			if idx >= ell {
				idx -= ell
			}
			y[i] = workspace[idx]
		}
	}
	return y
}

// getSBoxPool returns the cached S-box pool, generating it once on first access.
func (f *FASTCipher) getSBoxPool() [][]byte {
	f.sboxPoolOnce.Do(func() {
		f.sboxPool = f.generateSBoxPool(nil)
		// Pre-compute all inverse S-boxes
		f.invSboxPool = make([][]byte, f.m)
		for i := 0; i < f.m; i++ {
			f.invSboxPool[i] = f.computeInverseSBox(f.sboxPool[i])
		}
	})
	return f.sboxPool
}

// generateSBoxPool generates m bijective S-boxes using Setup1 from the FAST specification.
// The S-boxes depend only on the master key and alphabet size, not on the tweak.
func (f *FASTCipher) generateSBoxPool(_ []byte) [][]byte {
	sboxes := make([][]byte, f.m)

	// Derive S-box seed K_S using PRF₂(K ∥ "FPE-Pool" ∥ (a,m))
	// PRF₂ outputs L₂ = 2s = 256 bits for 128-bit security
	input := []byte("FPE-Pool")
	// Encode instance₁ = (a, m) as unambiguous byte string
	input = append(input, 1, 0)                    // a=256 as 2 bytes
	input = append(input, byte(f.m>>8), byte(f.m)) // m as 2 bytes

	// Use AES-CMAC as PRF₂ to generate 256 bits (32 bytes)
	kseed := make([]byte, 32)
	copy(kseed[:16], f.aesCMACOptimized(input))
	copy(kseed[16:], f.aesCMACOptimized(append(input, 0x01)))

	// Split K_S into AES key K₂ (first 128 bits) and IV₂ (last 128 bits)
	block2, err := aes.NewCipher(kseed[:16])
	if err != nil {
		panic("failed to create AES cipher for S-box generation: " + err.Error())
	}
	iv2 := kseed[16:]

	// Generate each S-box using AES-CTR stream
	for i := 0; i < f.m; i++ {
		sboxes[i] = f.generateSingleSBoxWithCTR(block2, iv2, i)
	}

	return sboxes
}

// generateSingleSBoxWithCTR generates a single S-box using AES-CTR and Fisher-Yates.
func (f *FASTCipher) generateSingleSBoxWithCTR(block cipher.Block, iv []byte, sboxIndex int) []byte {
	sbox := make([]byte, 256)
	for i := range sbox {
		sbox[i] = byte(i)
	}

	// Initialize CTR mode with IV for this S-box
	// Each S-box uses a different starting counter value
	ctr := make([]byte, 16)
	copy(ctr, iv)
	// Add S-box index to counter to ensure different streams for each S-box
	binary.BigEndian.PutUint32(ctr[12:], uint32(sboxIndex)<<16)

	// Use Go's built-in CTR mode for better performance
	stream := cipher.NewCTR(block, ctr)

	// Random byte generator using AES-CTR with larger buffer for efficiency
	const bufferSize = 4096 // Increased buffer size
	randomBuf := make([]byte, bufferSize)
	bufPos := bufferSize // Force initial fill

	getNext32 := func() uint32 {
		// Refill buffer if needed using CTR stream
		if bufPos+4 > bufferSize {
			stream.XORKeyStream(randomBuf, randomBuf)
			bufPos = 0
		}

		val := binary.BigEndian.Uint32(randomBuf[bufPos:])
		bufPos += 4
		return val
	}

	// Fisher-Yates shuffle using Lemire's method for unbiased selection
	for i := 255; i > 0; i-- {
		// Use Lemire's method for unbiased random selection
		j := lemireRandomIndex(getNext32, i+1)
		sbox[i], sbox[j] = sbox[j], sbox[i]
	}

	return sbox
}

// generateIndexSequence generates the sequence of S-box indices using Setup2 from the FAST specification.
// The sequence depends on the instance parameters (ℓ, n, w, w') and the tweak.
func (f *FASTCipher) generateIndexSequence(n, ell, w, wPrime int, tweak []byte) []byte {
	// Fast path: when tweak is nil, check if we've already cached the result
	if tweak == nil {
		return f.generateIndexSequenceNoTweak(n, ell, w, wPrime)
	}

	// Derive index seed K_SEQ using PRF₁(K ∥ "FPE-SEQ" ∥ (instance₁, instance₂) ∥ tweak)
	// where instance₁ = (256, m) and instance₂ = (ℓ, n, w, w')
	// PRF₁ outputs L₁ = 2s = 256 bits for 128-bit security

	input := []byte("FPE-SEQ")

	// Add instance1: (256, m) as unambiguous encoding
	input = append(input, 1, 0)                    // 256 as 2 bytes
	input = append(input, byte(f.m>>8), byte(f.m)) // m as 2 bytes

	// Add instance2: (ℓ, n, w, w′) as unambiguous encoding
	input = append(input, byte(ell>>8), byte(ell)) // ℓ as 2 bytes
	input = append(input, byte(n>>8), byte(n))     // n as 2 bytes
	input = append(input, byte(w), byte(wPrime))   // w and w' as 1 byte each

	// Add tweak
	input = append(input, tweak...)

	// Use AES-CMAC as PRF₁ to generate 256 bits (32 bytes)
	kseq := make([]byte, 32)
	copy(kseq[:16], f.aesCMACOptimized(input))
	copy(kseq[16:], f.aesCMACOptimized(append(input, 0x01)))

	// Create cache key from the first 16 bytes of kseq (the AES key)
	cacheKey := string(kseq[:16])

	// Check cache first
	f.indexCacheMu.RLock()
	block1, exists := f.indexCipherCache[cacheKey]
	f.indexCacheMu.RUnlock()

	if !exists {
		// Cache miss - create new cipher
		var err error
		block1, err = aes.NewCipher(kseq[:16])
		if err != nil {
			panic("failed to create AES cipher for sequence generation: " + err.Error())
		}

		// Store in cache
		f.indexCacheMu.Lock()
		if f.indexCipherCache == nil {
			f.indexCipherCache = make(map[string]cipher.Block)
		}
		f.indexCipherCache[cacheKey] = block1
		f.indexCacheMu.Unlock()
	}

	iv1 := make([]byte, 16)
	copy(iv1, kseq[16:])
	iv1[14], iv1[15] = 0, 0 // Force last two bytes to 0 (avoid slide attacks)

	// Generate n bytes using Go's built-in CTR mode
	seq := make([]byte, n)

	// Use cipher.NewCTR for better performance
	stream := cipher.NewCTR(block1, iv1)
	stream.XORKeyStream(seq, seq)

	// Map to [0, m-1]
	// When m=256, we don't need to do modulo since seq[i] is already a byte [0,255]
	if f.m > 0 && f.m < 256 {
		for i := range seq {
			seq[i] = seq[i] % byte(f.m)
		}
	}

	return seq
}

// generateIndexSequenceNoTweak is an optimized version for when tweak is nil.
// It caches the result since the same parameters will always produce the same sequence.
func (f *FASTCipher) generateIndexSequenceNoTweak(n, ell, w, wPrime int) []byte {
	// Create cache key from parameters
	cacheKey := fmt.Sprintf("%d:%d:%d:%d", n, ell, w, wPrime)

	// Check cache first
	f.noTweakSeqMu.RLock()
	if seq, exists := f.noTweakSeqCache[cacheKey]; exists {
		f.noTweakSeqMu.RUnlock()
		return seq
	}
	f.noTweakSeqMu.RUnlock()

	// Cache miss - generate the sequence
	input := []byte("FPE-SEQ")

	// Add instance1: (256, m) as unambiguous encoding
	input = append(input, 1, 0)                    // 256 as 2 bytes
	input = append(input, byte(f.m>>8), byte(f.m)) // m as 2 bytes

	// Add instance2: (ℓ, n, w, w′) as unambiguous encoding
	input = append(input, byte(ell>>8), byte(ell)) // ℓ as 2 bytes
	input = append(input, byte(n>>8), byte(n))     // n as 2 bytes
	input = append(input, byte(w), byte(wPrime))   // w and w' as 1 byte each

	// No tweak to add

	// Use AES-CMAC as PRF₁ to generate 256 bits (32 bytes)
	kseq := make([]byte, 32)
	copy(kseq[:16], f.aesCMACOptimized(input))
	copy(kseq[16:], f.aesCMACOptimized(append(input, 0x01)))

	// Create cipher for sequence generation
	block1, err := aes.NewCipher(kseq[:16])
	if err != nil {
		panic("failed to create AES cipher for sequence generation: " + err.Error())
	}

	iv1 := make([]byte, 16)
	copy(iv1, kseq[16:])
	iv1[14], iv1[15] = 0, 0 // Force last two bytes to 0 (avoid slide attacks)

	// Generate n bytes using Go's built-in CTR mode
	seq := make([]byte, n)

	// Use cipher.NewCTR for better performance
	stream := cipher.NewCTR(block1, iv1)
	stream.XORKeyStream(seq, seq)

	// Map to [0, m-1]
	// When m=256, we don't need to do modulo since seq[i] is already a byte [0,255]
	if f.m > 0 && f.m < 256 {
		for i := range seq {
			seq[i] = seq[i] % byte(f.m)
		}
	}

	// Store in cache
	f.noTweakSeqMu.Lock()
	if f.noTweakSeqCache == nil {
		f.noTweakSeqCache = make(map[string][]byte)
	}
	f.noTweakSeqCache[cacheKey] = seq
	f.noTweakSeqMu.Unlock()

	return seq
}

// computeInverseSBox computes the inverse permutation of an S-box.
// For each i, inv[sbox[i]] = i.
func (f *FASTCipher) computeInverseSBox(sbox []byte) []byte {
	inv := make([]byte, 256)
	for i := 0; i < 256; i++ {
		inv[sbox[i]] = byte(i)
	}
	return inv
}

// computeRounds computes the number of rounds n based on the FAST security analysis.
// The formula ensures statistical indistinguishability from a random permutation.
func (f *FASTCipher) computeRounds(ell int) int {
	// For 128-bit security with a=256 (bytes)
	// Based on FAST paper recommendations
	s := 128.0 // security parameter

	// From the FAST specification:
	// n = ℓ * ⌈2 * max(2s/(ℓ*log₂m), s/√ℓ*ln(a-1), s/√ℓ*log₂(a-1)+2/√ℓ)⌉
	// For byte data with m=256, a=256:
	const (
		log2m  = 8.0   // log₂(256)
		lnA1   = 5.541 // ln(255)
		log2A1 = 7.994 // log₂(255)
	)

	sqrtEll := math.Sqrt(float64(ell))

	factor1 := (2 * s) / (float64(ell) * log2m) // 2s/(ℓ*log₂m)
	factor2 := s / (sqrtEll * lnA1)             // s/√ℓ*ln(a-1)
	factor3 := s/(sqrtEll*log2A1) + 2/sqrtEll   // s/√ℓ*log₂(a-1)+2/√ℓ

	maxFactor := math.Max(factor1, math.Max(factor2, factor3))

	// Calculate rounds: n = ℓ * ⌈2 * maxFactor⌉
	rounds := ell * int(math.Ceil(2*maxFactor))

	// Apply minimum rounds for security guarantee
	minRounds := 64
	if ell > 32 {
		// For larger data, ensure we have at least 2 full diffusion cycles
		minRounds = ell * 4
	}

	if rounds < minRounds {
		rounds = minRounds
	}

	// FAST requires n to be a multiple of ℓ for the security analysis
	if rounds%ell != 0 {
		rounds = ((rounds / ell) + 1) * ell
	}

	return rounds
}

// computeBranchDistances computes the branch distances w and w' that determine
// which positions are mixed in each round. These ensure good diffusion properties.
func (f *FASTCipher) computeBranchDistances(ell int) (w, wPrime int) {
	// From FAST spec:
	// w = min(⌈√ℓ⌉, ℓ-2)
	// w' = max(1, w-1)

	// Compute ceiling of square root
	sqrtEll := int(math.Ceil(math.Sqrt(float64(ell))))

	w = sqrtEll
	if w > ell-2 {
		w = ell - 2
	}
	if w < 0 {
		w = 0
	}

	wPrime = w - 1
	if wPrime < 1 {
		wPrime = 1
	}

	// Special case for ℓ=2
	if ell == 2 {
		w = 0
		wPrime = 1
	}

	return w, wPrime
}

// encrypt2Byte handles the special case of 2-byte encryption
// Uses a different approach since FAST with w=0 doesn't provide unique decryption
func (f *FASTCipher) encrypt2Byte(data []byte, tweak []byte) []byte {
	if len(data) != 2 {
		panic("encrypt2Byte called with wrong size")
	}

	// Generate S-boxes
	sboxes := f.getSBoxPool()

	// Use tweak to select starting S-box
	var tweakHash byte
	if len(tweak) > 0 {
		mac := f.aesCMACOptimized(tweak)
		tweakHash = mac[0]
	}

	// Apply 8 rounds of substitution for 128-bit security
	result := make([]byte, 2)
	copy(result, data)

	for round := 0; round < 8; round++ {
		// Select S-box based on round and tweak
		sboxIdx := (int(tweakHash) + round*37) % f.m
		sbox := sboxes[sboxIdx]

		// Apply S-box to each byte
		result[0] = sbox[result[0]]
		result[1] = sbox[result[1]]

		// Mix bytes
		result[0], result[1] = result[1], byte(int(result[0])+int(result[1]))
	}

	return result
}

// decrypt2Byte handles the special case of 2-byte decryption
func (f *FASTCipher) decrypt2Byte(data []byte, tweak []byte) []byte {
	if len(data) != 2 {
		panic("decrypt2Byte called with wrong size")
	}

	// Generate S-boxes and their inverses
	_ = f.getSBoxPool() // This initializes both sboxPool and invSboxPool

	// Use tweak to select starting S-box
	var tweakHash byte
	if len(tweak) > 0 {
		mac := f.aesCMACOptimized(tweak)
		tweakHash = mac[0]
	}

	result := make([]byte, 2)
	copy(result, data)

	// Apply inverse of 8 rounds
	for round := 7; round >= 0; round-- {
		// Unmix bytes
		temp := result[0]
		result[0] = byte(int(result[1])-int(temp)+256) & 0xFF
		result[1] = temp

		// Select S-box and compute inverse
		sboxIdx := (int(tweakHash) + round*37) % f.m
		invSbox := f.invSboxPool[sboxIdx]

		// Apply inverse S-box to each byte
		result[0] = invSbox[result[0]]
		result[1] = invSbox[result[1]]
	}

	return result
}

package validation

import "fmt"

// ValidateInput performs common validation checks on any input string.
// It checks for length constraints, null bytes, and optionally shell metacharacters.
func (v *Validator) ValidateInput(value string, maxLength int, fieldName string, checkShellChars bool) error {
	// Check length (handle empty values based on field type)
	if fieldName == "command" || fieldName == "flag name" {
		if err := validateStringLength(value, maxLength, fieldName); err != nil {
			return err
		}
	} else if len(value) > maxLength {
		return fmt.Errorf("%s exceeds maximum length of %d", fieldName, maxLength)
	}

	// Check for null bytes
	if err := validateNoNullBytes(value, fieldName); err != nil {
		return err
	}

	// Check for shell metacharacters if requested
	if checkShellChars {
		if err := v.validateNoShellMetaChars(value, fieldName); err != nil {
			return err
		}
	}

	return nil
}

// ValidateAllInputs performs validation on a set of inputs with consistent rules.
// This reduces duplication when validating multiple similar inputs.
func (v *Validator) ValidateAllInputs(inputs []string, maxLength int, fieldPrefix string, checkShellChars bool) error {
	for i, input := range inputs {
		fieldName := fmt.Sprintf("%s %d", fieldPrefix, i)
		if err := v.ValidateInput(input, maxLength, fieldName, checkShellChars); err != nil {
			return err
		}
	}
	return nil
}

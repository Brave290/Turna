import type { TextInputProps } from 'react-native';

/**
 * Shared autofill / keyboard props so the OS keyboard offers to save and fill
 * values (passwords, emails, codes, names). Spread onto TextInput:
 *   `<TextInput {...emailInputProps} … />`
 *
 * `importantForAutofill` is honoured on Android; iOS keys are ignored there
 * (and vice versa for `textContentType`) — safe on both platforms.
 */
export const emailInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'email',
  textContentType: 'emailAddress',
  keyboardType: 'email-address',
  importantForAutofill: 'yes',
};

export const passwordInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'password',
  textContentType: 'password',
  importantForAutofill: 'yes',
};

export const newPasswordInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'new-password',
  textContentType: 'newPassword',
  importantForAutofill: 'yes',
};

export const nameInputProps: TextInputProps = {
  autoCapitalize: 'words',
  autoComplete: 'name',
  textContentType: 'name',
  importantForAutofill: 'yes',
};

export const otpInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'one-time-code',
  textContentType: 'oneTimeCode',
  importantForAutofill: 'yes',
};

export const phoneInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'tel',
  textContentType: 'telephoneNumber',
  keyboardType: 'phone-pad',
  importantForAutofill: 'yes',
};

export const urlInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'url',
  textContentType: 'URL',
  keyboardType: 'url',
  importantForAutofill: 'no',
};

/** Free text (notes, descriptions): no identity autofill, keep corrections. */
export const noteInputProps: TextInputProps = {
  autoCapitalize: 'sentences',
  autoCorrect: true,
  autoComplete: 'off',
  importantForAutofill: 'no',
};

/** Codes / short identifiers (join codes, references): no autocorrect. */
export const codeInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  importantForAutofill: 'no',
};

/** Numeric amounts — keyboard suggestions stay numeric, no autofill. */
export const amountInputProps: TextInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  keyboardType: 'numeric',
  importantForAutofill: 'no',
};

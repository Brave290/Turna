export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    continue: 'Continue',
    back: 'Back',
    skip: 'Skip',
    loading: 'Loading...',
    error: 'Something went wrong',
    success: 'Success',
  },
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    verifyEmail: 'Verify Email',
  },
  nav: {
    home: 'Home',
    circles: 'Circles',
    ledger: 'Ledger',
    debts: 'Debts',
    profile: 'Profile',
    settings: 'Settings',
  },
  admin: {
    dashboard: 'Dashboard',
    members: 'Members',
    broadcast: 'Broadcast',
    deleteUser: 'Delete User',
    searchUsers: 'Search users...',
  },
  onboarding: {
    slide1Title: 'Welcome to Turna',
    slide1Body: 'Manage shared expenses with your circles effortlessly.',
    slide2Title: 'Track Debts',
    slide2Body: 'Keep track of who owes what and settle up with ease.',
    slide3Title: 'Stay Organized',
    slide3Body: 'View your ledger and manage all transactions in one place.',
  },
} as const;

export type Translations = typeof en;

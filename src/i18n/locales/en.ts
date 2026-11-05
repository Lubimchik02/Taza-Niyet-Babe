import type { Translation } from './ru';

const en: Translation = {
  common: {
    appName: 'Taza Niyet',
    tagline: 'Pure intention',
    continue: 'Continue',
    back: 'Back',
    loading: 'Loading…',
    retry: 'Retry',
    comingSoon: 'Coming soon',
  },
  onboarding: {
    skip: 'Skip',
    next: 'Next',
    start: 'Get started',
    progress: 'Slide {{current}} of {{total}}',
    slides: {
      hours: {
        title: 'Every hour counts',
        body: 'Your coordinator confirms your hours. You always see exactly how much you did.',
      },
      growth: {
        title: 'Level up your skills',
        body: 'Quests give you points, levels and skills: teamwork, ecology, leadership.',
      },
      portfolio: {
        title: 'A portfolio for your future',
        body: 'A verified certificate with a QR check — for your CV, university and grants.',
      },
    },
  },
  auth: {
    signInTitle: 'Sign in',
    signInSubtitle: 'Enter your email or phone number and we will send you a code.',
    contactLabel: 'Email or phone',
    contactPlaceholder: 'name@mail.kz or +7 700 000 00 00',
    sendCode: 'Get code',
    verifyTitle: 'Enter the code',
    verifySubtitle: 'We sent a code to {{contact}}',
    codeLabel: 'Code from the message',
    verify: 'Sign in',
    resend: 'Send the code again',
    resendIn: 'Resend in {{seconds}} s',
    changeContact: 'Change email or phone',
    codeSent: 'Code sent',
    errors: {
      invalidContact: 'Enter a valid email or a phone number like +7…',
      invalidCode: 'The code has 6 digits',
      wrongCode: 'Wrong or expired code',
      rateLimited: 'Too many attempts. Please wait a bit and try again.',
      network: 'Cannot reach the server. Check your connection.',
      notConfigured: 'Server is not configured: fill in .env (see README).',
      generic: 'Something went wrong. Please try again.',
    },
  },
  tabs: {
    quests: 'Quests',
    myQuests: 'My quests',
    benefit: 'My benefit',
    profile: 'Profile',
  },
  placeholders: {
    quests: 'Quest feed from your organizations.',
    myQuests: 'Upcoming, active and completed quests.',
    benefit: 'Confirmed hours, level, skills and achievements.',
  },
  profile: {
    title: 'Profile',
    signedInAs: 'Signed in as',
    language: 'Language',
    languageSystem: 'System default',
    theme: 'Theme',
    themeSystem: 'System default',
    themeLight: 'Light',
    themeDark: 'Dark',
    signOut: 'Sign out',
  },
};

export default en;

import type { Translation } from './ru';

const kk: Translation = {
  common: {
    appName: 'Taza Niyet',
    tagline: 'Таза ниет',
    continue: 'Жалғастыру',
    back: 'Артқа',
    loading: 'Жүктелуде…',
    retry: 'Қайталау',
    comingSoon: 'Жақында осында пайда болады',
  },
  onboarding: {
    skip: 'Өткізіп жіберу',
    next: 'Әрі қарай',
    start: 'Бастау',
    progress: '{{total}} слайдтың {{current}}-сі',
    slides: {
      hours: {
        title: 'Әр сағат есепте',
        body: 'Үйлестіруші сағаттарыңды растайды. Қанша жұмыс істегеніңді әрдайым көресің.',
      },
      growth: {
        title: 'Дағдыларыңды дамыт',
        body: 'Квесттер ұпай, деңгей және дағды береді: командалық жұмыс, экология, көшбасшылық.',
      },
      portfolio: {
        title: 'Болашаққа портфолио',
        body: 'QR арқылы тексерілетін расталған сертификат — түйіндеме, ЖОО және гранттар үшін.',
      },
    },
  },
  auth: {
    signInTitle: 'Кіру',
    signInSubtitle: 'Email немесе телефон нөміріңді енгіз — біз код жібереміз.',
    contactLabel: 'Email немесе телефон',
    contactPlaceholder: 'name@mail.kz немесе +7 700 000 00 00',
    sendCode: 'Код алу',
    verifyTitle: 'Кодты енгіз',
    verifySubtitle: 'Код {{contact}} мекенжайына жіберілді',
    codeLabel: 'Хабарламадағы код',
    verify: 'Кіру',
    resend: 'Кодты қайта жіберу',
    resendIn: '{{seconds}} с кейін қайта жіберу',
    changeContact: 'Email немесе телефонды өзгерту',
    codeSent: 'Код жіберілді',
    errors: {
      invalidContact: 'Дұрыс email немесе +7… форматындағы телефон енгіз',
      invalidCode: 'Код 6 цифрдан тұрады',
      wrongCode: 'Код қате немесе мерзімі өтті',
      rateLimited: 'Әрекет тым көп. Біраз күтіп, қайта көр.',
      network: 'Сервермен байланыс жоқ. Интернетті тексер.',
      notConfigured: 'Сервер бапталмаған: .env толтыр (README қара).',
      generic: 'Бірдеңе дұрыс болмады. Қайта көр.',
    },
  },
  tabs: {
    quests: 'Квесттер',
    myQuests: 'Менің квесттерім',
    benefit: 'Менің пайдам',
    profile: 'Профиль',
  },
  placeholders: {
    quests: 'Ұйымдарыңның квесттер таспасы.',
    myQuests: 'Алдағы, белсенді және аяқталған квесттер.',
    benefit: 'Расталған сағаттар, деңгей, дағдылар және жетістіктер.',
  },
  profile: {
    title: 'Профиль',
    signedInAs: 'Сен кірдің:',
    language: 'Тіл',
    languageSystem: 'Жүйедегідей',
    theme: 'Тақырып',
    themeSystem: 'Жүйедегідей',
    themeLight: 'Ашық',
    themeDark: 'Қараңғы',
    signOut: 'Шығу',
  },
};

export default kk;

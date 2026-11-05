/** Эталонная локаль: структура ключей kk и en проверяется по ней типами и тестом. */
const ru = {
  common: {
    appName: 'Taza Niyet',
    tagline: 'Чистое намерение',
    continue: 'Продолжить',
    back: 'Назад',
    loading: 'Загрузка…',
    retry: 'Повторить',
    comingSoon: 'Скоро здесь появится',
  },
  onboarding: {
    skip: 'Пропустить',
    next: 'Далее',
    start: 'Начать',
    progress: 'Слайд {{current}} из {{total}}',
    slides: {
      hours: {
        title: 'Каждый час на счету',
        body: 'Координатор подтверждает твои часы. Ты всегда видишь, сколько отработал.',
      },
      growth: {
        title: 'Прокачивай навыки',
        body: 'Квесты дают баллы, уровни и навыки: командная работа, экология, лидерство.',
      },
      portfolio: {
        title: 'Портфолио для будущего',
        body: 'Подтверждённый сертификат с QR-проверкой — для резюме, вуза и грантов.',
      },
    },
  },
  auth: {
    signInTitle: 'Вход',
    signInSubtitle: 'Введи email или номер телефона — мы пришлём код.',
    contactLabel: 'Email или телефон',
    contactPlaceholder: 'name@mail.kz или +7 700 000 00 00',
    sendCode: 'Получить код',
    verifyTitle: 'Введи код',
    verifySubtitle: 'Мы отправили код на {{contact}}',
    codeLabel: 'Код из сообщения',
    verify: 'Войти',
    resend: 'Отправить код ещё раз',
    resendIn: 'Повторно через {{seconds}} с',
    changeContact: 'Изменить email или телефон',
    codeSent: 'Код отправлен',
    errors: {
      invalidContact: 'Введи корректный email или телефон в формате +7…',
      invalidCode: 'Код состоит из 6 цифр',
      wrongCode: 'Неверный или просроченный код',
      rateLimited: 'Слишком много попыток. Подожди немного и попробуй снова.',
      network: 'Нет связи с сервером. Проверь интернет.',
      notConfigured: 'Сервер не настроен: заполни .env (см. README).',
      generic: 'Что-то пошло не так. Попробуй ещё раз.',
    },
  },
  tabs: {
    quests: 'Квесты',
    myQuests: 'Мои квесты',
    benefit: 'Моя выгода',
    profile: 'Профиль',
  },
  placeholders: {
    quests: 'Лента квестов твоих организаций.',
    myQuests: 'Предстоящие, активные и завершённые квесты.',
    benefit: 'Подтверждённые часы, уровень, навыки и достижения.',
  },
  profile: {
    title: 'Профиль',
    signedInAs: 'Ты вошёл как',
    language: 'Язык',
    languageSystem: 'Как в системе',
    theme: 'Тема',
    themeSystem: 'Как в системе',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    signOut: 'Выйти',
  },
};

export type Translation = typeof ru;
export default ru;

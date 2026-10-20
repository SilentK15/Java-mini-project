const COPY = Object.freeze({
  en: {
    language: "Language", welcomeBack: "Welcome back", createAccountHeading: "Create your citizen account",
    loginDescription: "Sign in to report and track civic issues.", registerDescription: "Register to submit and follow up on your complaints.",
    fullName: "Full name", email: "Email", password: "Password", signIn: "Sign in", createAccount: "Create account",
    switchToRegister: "New here? Create a citizen account", switchToLogin: "Already registered? Sign in",
  },
  mr: {
    language: "भाषा", welcomeBack: "पुन्हा स्वागत आहे", createAccountHeading: "तुमचे नागरिक खाते तयार करा",
    loginDescription: "नागरी समस्या नोंदवण्यासाठी आणि त्यांचा मागोवा घेण्यासाठी साइन इन करा.", registerDescription: "तक्रारी नोंदवण्यासाठी आणि त्याबाबत पुढील माहिती मिळवण्यासाठी नोंदणी करा.",
    fullName: "पूर्ण नाव", email: "ईमेल", password: "पासवर्ड", signIn: "साइन इन करा", createAccount: "खाते तयार करा",
    switchToRegister: "नवीन आहात? नागरिक खाते तयार करा", switchToLogin: "आधीच नोंदणी केली आहे? साइन इन करा",
  },
  hi: {
    language: "भाषा", welcomeBack: "फिर से स्वागत है", createAccountHeading: "अपना नागरिक खाता बनाएं",
    loginDescription: "नागरिक समस्याओं की रिपोर्ट करने और उनकी स्थिति देखने के लिए साइन इन करें।", registerDescription: "शिकायतें दर्ज करने और उनकी स्थिति जानने के लिए पंजीकरण करें।",
    fullName: "पूरा नाम", email: "ईमेल", password: "पासवर्ड", signIn: "साइन इन करें", createAccount: "खाता बनाएं",
    switchToRegister: "नए हैं? नागरिक खाता बनाएं", switchToLogin: "पहले से पंजीकृत हैं? साइन इन करें",
  },
});

export function getAuthCopy(language) {
  return COPY[language] || COPY.en;
}

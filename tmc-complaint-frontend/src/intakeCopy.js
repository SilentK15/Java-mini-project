export const INTAKE_LANGUAGES = Object.freeze([
  { code: "en", name: "English" },
  { code: "mr", name: "मराठी" },
  { code: "hi", name: "हिन्दी" },
]);

const COPY = Object.freeze({
  en: {
    language: "Form language", section: "NEW REQUEST", heading: "Submit Complaint",
    intro: "Provide details about the civic issue you want to report.",
    title: "Complaint title", titlePlaceholder: "Example: Large pothole near KolShet Road",
    description: "Description", descriptionPlaceholder: "Describe the problem and provide any useful details...",
    category: "Category", categories: { ROAD: "Road", GARBAGE: "Garbage", WATER: "Water", ELECTRICITY: "Electricity", STREET_LIGHT: "Street light", DRAINAGE: "Drainage", OTHER: "Other" },
    priority: "Priority", priorities: { LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
    location: "Location", locationPlaceholder: "Example: KolShet Road, Thane", useLocation: "Use my current location",
    gpsAttached: "GPS coordinates attached", photo: "Photo evidence", optional: "(optional)", photoRules: "Valid JPG or PNG · up to 5 MB",
    draftNote: "Complaint text and location are saved in this browser tab until sign-out or tab close. Photo files are not saved.",
    submit: "Submit Complaint", submitting: "Submitting...",
  },
  mr: {
    language: "फॉर्मची भाषा", section: "नवीन तक्रार", heading: "तक्रार नोंदवा",
    intro: "तुम्हाला नोंदवायच्या नागरी समस्येची माहिती द्या.",
    title: "तक्रारीचे शीर्षक", titlePlaceholder: "उदाहरण: कोलशेत रस्त्याजवळ मोठा खड्डा",
    description: "वर्णन", descriptionPlaceholder: "समस्येचे वर्णन आणि आवश्यक माहिती द्या...",
    category: "प्रकार", categories: { ROAD: "रस्ता", GARBAGE: "कचरा", WATER: "पाणी", ELECTRICITY: "वीज", STREET_LIGHT: "पथदिवा", DRAINAGE: "जलनिस्सारण", OTHER: "इतर" },
    priority: "प्राधान्य", priorities: { LOW: "कमी", MEDIUM: "मध्यम", HIGH: "उच्च" },
    location: "ठिकाण", locationPlaceholder: "उदाहरण: कोलशेत रस्ता, ठाणे", useLocation: "माझे सध्याचे ठिकाण वापरा",
    gpsAttached: "GPS निर्देशांक जोडले आहेत", photo: "फोटो पुरावा", optional: "(पर्यायी)", photoRules: "वैध JPG किंवा PNG · कमाल 5 MB",
    draftNote: "तक्रारीचा मजकूर आणि ठिकाण साइन आउट करेपर्यंत किंवा हा टॅब बंद करेपर्यंत जतन राहतात. फोटो जतन होत नाहीत.",
    submit: "तक्रार पाठवा", submitting: "तक्रार पाठवत आहे...",
  },
  hi: {
    language: "फ़ॉर्म की भाषा", section: "नई शिकायत", heading: "शिकायत दर्ज करें",
    intro: "जिस नागरिक समस्या की रिपोर्ट करनी है, उसका विवरण दें।",
    title: "शिकायत का शीर्षक", titlePlaceholder: "उदाहरण: कोलशेत रोड के पास बड़ा गड्ढा",
    description: "विवरण", descriptionPlaceholder: "समस्या और उपयोगी जानकारी का वर्णन करें...",
    category: "श्रेणी", categories: { ROAD: "सड़क", GARBAGE: "कचरा", WATER: "पानी", ELECTRICITY: "बिजली", STREET_LIGHT: "स्ट्रीट लाइट", DRAINAGE: "जल निकासी", OTHER: "अन्य" },
    priority: "प्राथमिकता", priorities: { LOW: "कम", MEDIUM: "मध्यम", HIGH: "उच्च" },
    location: "स्थान", locationPlaceholder: "उदाहरण: कोलशेत रोड, ठाणे", useLocation: "मेरा वर्तमान स्थान उपयोग करें",
    gpsAttached: "GPS निर्देशांक जोड़े गए", photo: "फ़ोटो साक्ष्य", optional: "(वैकल्पिक)", photoRules: "मान्य JPG या PNG · अधिकतम 5 MB",
    draftNote: "शिकायत का पाठ और स्थान साइन आउट करने या यह टैब बंद करने तक इसी ब्राउज़र टैब में सहेजे रहते हैं। फ़ोटो फ़ाइलें सहेजी नहीं जातीं।",
    submit: "शिकायत भेजें", submitting: "शिकायत भेजी जा रही है...",
  },
});

export function getIntakeCopy(language) {
  return COPY[language] || COPY.en;
}

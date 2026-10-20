package com.tmc.complaintmanager.service;

import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Provider-independent template renderer for municipal complaint notifications.
 * Supports English (en), Marathi (mr), and Hindi (hi).
 */
@Service
public class NotificationTemplateService {

    public record RenderedMessage(String subject, String body, String smsText) {}

    public RenderedMessage render(NotificationEvent event, String language) {
        String lang = language == null ? "en" : language.toLowerCase(Locale.ROOT);
        return switch (lang) {
            case "mr" -> renderMarathi(event);
            case "hi" -> renderHindi(event);
            default -> renderEnglish(event);
        };
    }

    private RenderedMessage renderEnglish(NotificationEvent event) {
        String num = safe(event.complaintNumber());
        String title = safe(event.complaintTitle());
        String status = safe(event.status());
        String reason = event.reason() != null && !event.reason().isBlank()
                ? "\nNote: " + event.reason().trim() : "";

        return switch (event.eventType()) {
            case SUBMISSION_RECEIVED -> new RenderedMessage(
                    "CivicConnect: Complaint " + num + " Received",
                    "Dear Citizen,\n\nYour civic complaint [" + num + "] has been successfully recorded.\n"
                            + "Issue: " + title + "\n"
                            + "Status: " + status + "\n\n"
                            + "Municipal department staff will review and act on this report.\n"
                            + "You can track progress in your CivicConnect portal.\n\n"
                            + "Thane Municipal Corporation",
                    "CivicConnect: Complaint " + num + " recorded. Status: " + status + ". TMC."
            );
            case RESOLVED -> new RenderedMessage(
                    "CivicConnect: Complaint " + num + " Resolved",
                    "Dear Citizen,\n\nYour complaint [" + num + "] has been marked as RESOLVED.\n"
                            + "Issue: " + title + reason + "\n\n"
                            + "Please visit CivicConnect to view resolution evidence and share your feedback.\n\n"
                            + "Thane Municipal Corporation",
                    "CivicConnect: Complaint " + num + " resolved. Check portal for evidence. TMC."
            );
            case REOPEN_REQUESTED -> new RenderedMessage(
                    "CivicConnect: Reopening Request for " + num,
                    "Dear Citizen,\n\nYour request to reopen complaint [" + num + "] has been submitted.\n"
                            + "Issue: " + title + reason + "\n\n"
                            + "Department staff will review your appeal.\n\n"
                            + "Thane Municipal Corporation",
                    "CivicConnect: Reopen request for " + num + " received. Under review. TMC."
            );
            default -> new RenderedMessage(
                    "CivicConnect: Update on Complaint " + num,
                    "Dear Citizen,\n\nYour complaint [" + num + "] status has changed to: " + status + ".\n"
                            + "Issue: " + title + reason + "\n\n"
                            + "Track the latest status in your CivicConnect portal.\n\n"
                            + "Thane Municipal Corporation",
                    "CivicConnect: Complaint " + num + " updated to " + status + ". TMC."
            );
        };
    }

    private RenderedMessage renderMarathi(NotificationEvent event) {
        String num = safe(event.complaintNumber());
        String title = safe(event.complaintTitle());
        String status = safe(event.status());
        String reason = event.reason() != null && !event.reason().isBlank()
                ? "\nटीप: " + event.reason().trim() : "";

        return switch (event.eventType()) {
            case SUBMISSION_RECEIVED -> new RenderedMessage(
                    "सिव्हिककनेक्ट: तक्रार " + num + " नोंदवली गेली",
                    "प्रिय नागरिक,\n\nआपली नागरी तक्रार [" + num + "] यशस्वीरित्या नोंदवली गेली आहे.\n"
                            + "समस्या: " + title + "\n"
                            + "स्थिती: " + status + "\n\n"
                            + "ठाणे महानगरपालिका संबंधित विभाग यावर लवकरच कार्यवाही करेल.\n"
                            + "ठाणे महानगरपालिका",
                    "सिव्हिककनेक्ट: तक्रार " + num + " नोंदवली. स्थिती: " + status + ". TMC."
            );
            case RESOLVED -> new RenderedMessage(
                    "सिव्हिककनेक्ट: तक्रार " + num + " निवारण करण्यात आली",
                    "प्रिय नागरिक,\n\nआपली तक्रार [" + num + "] निवारण (RESOLVED) झाली आहे.\n"
                            + "समस्या: " + title + reason + "\n\n"
                            + "कृपया पुरावा पाहण्यासाठी आणि अभिप्राय देण्यासाठी पोर्टलला भेट द्या.\n"
                            + "ठाणे महानगरपालिका",
                    "सिव्हिककनेक्ट: तक्रार " + num + " निवारण झाली. TMC."
            );
            case REOPEN_REQUESTED -> new RenderedMessage(
                    "सिव्हिककनेक्ट: तक्रार " + num + " पुन्हा सुरू करण्याची विनंती",
                    "प्रिय नागरिक,\n\nतक्रार [" + num + "] पुन्हा सुरू करण्याची विनंती प्राप्त झाली आहे.\n"
                            + "समस्या: " + title + reason + "\n\n"
                            + "संबंधित अधिकारी यावर पुनरावलोकन करतील.\n"
                            + "ठाणे महानगरपालिका",
                    "सिव्हिककनेक्ट: तक्रार " + num + " पुन्हा सुरू करण्याची विनंती प्राप्त. TMC."
            );
            default -> new RenderedMessage(
                    "सिव्हिककनेक्ट: तक्रार " + num + " अद्यतन",
                    "प्रिय नागरिक,\n\nआपल्या तक्रारीची [" + num + "] सद्यस्थिती: " + status + ".\n"
                            + "समस्या: " + title + reason + "\n\n"
                            + "ठाणे महानगरपालिका",
                    "सिव्हिककनेक्ट: तक्रार " + num + " अद्यतन: " + status + ". TMC."
            );
        };
    }

    private RenderedMessage renderHindi(NotificationEvent event) {
        String num = safe(event.complaintNumber());
        String title = safe(event.complaintTitle());
        String status = safe(event.status());
        String reason = event.reason() != null && !event.reason().isBlank()
                ? "\nविवरण: " + event.reason().trim() : "";

        return switch (event.eventType()) {
            case SUBMISSION_RECEIVED -> new RenderedMessage(
                    "सिविककनेक्ट: शिकायत " + num + " दर्ज की गई",
                    "प्रिय नागरिक,\n\nआपकी नागरिक शिकायत [" + num + "] सफलतापूर्वक दर्ज कर ली गई है।\n"
                            + "मुद्दा: " + title + "\n"
                            + "स्थिति: " + status + "\n\n"
                            + "ठाणे नगर निगम विभाग जल्द ही इस पर कार्रवाई करेगा।\n"
                            + "ठाणे नगर निगम",
                    "सिविककनेक्ट: शिकायत " + num + " दर्ज हुई। स्थिति: " + status + "। TMC."
            );
            case RESOLVED -> new RenderedMessage(
                    "सिविककनेक्ट: शिकायत " + num + " हल की गई",
                    "प्रिय नागरिक,\n\nआपकी शिकायत [" + num + "] हल (RESOLVED) हो गई है।\n"
                            + "मुद्दा: " + title + reason + "\n\n"
                            + "कृपया समाधान साक्ष्य देखने और अपनी प्रतिक्रिया देने के लिए पोर्टल पर जाएं।\n"
                            + "ठाणे नगर निगम",
                    "सिविककनेक्ट: शिकायत " + num + " हल हो गई है। TMC."
            );
            case REOPEN_REQUESTED -> new RenderedMessage(
                    "सिविककनेक्ट: शिकायत " + num + " पुनः खोलने का अनुरोध",
                    "प्रिय नागरिक,\n\nशिकायत [" + num + "] को पुनः खोलने का अनुरोध प्राप्त हुआ है।\n"
                            + "मुद्दा: " + title + reason + "\n\n"
                            + "संबंधित विभाग इसकी समीक्षा करेगा।\n"
                            + "ठाणे नगर निगम",
                    "सिविककनेक्ट: शिकायत " + num + " पुनः खोलने का अनुरोध प्राप्त। TMC."
            );
            default -> new RenderedMessage(
                    "सिविककनेक्ट: शिकायत " + num + " की स्थिति अपडेट",
                    "प्रिय नागरिक,\n\nआपकी शिकायत [" + num + "] की स्थिति अब: " + status + " है।\n"
                            + "मुद्दा: " + title + reason + "\n\n"
                            + "ठाणे नगर निगम",
                    "सिविककनेक्ट: शिकायत " + num + " अपडेट: " + status + "। TMC."
            );
        };
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}

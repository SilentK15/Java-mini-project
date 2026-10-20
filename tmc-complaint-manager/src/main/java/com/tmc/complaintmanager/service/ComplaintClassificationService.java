package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.Department;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * Safe adapter for an optional classifier. Recommendations are advisory and are
 * never applied to complaint records or used as official routing decisions.
 */
@Service
public class ComplaintClassificationService {
    private static final Set<String> CATEGORIES = Set.of(
            "ROAD", "GARBAGE", "WATER", "ELECTRICITY", "STREET_LIGHT", "DRAINAGE", "OTHER");
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH");

    private final List<ComplaintClassificationProvider> providers;
    private final boolean enabled;
    private final double minimumConfidence;

    public ComplaintClassificationService(List<ComplaintClassificationProvider> providers,
                                          @Value("${app.classification.enabled:false}") boolean enabled,
                                          @Value("${app.classification.minimum-confidence:0.75}") double minimumConfidence) {
        this.providers = List.copyOf(providers);
        this.enabled = enabled;
        if (!Double.isFinite(minimumConfidence) || minimumConfidence < 0 || minimumConfidence > 1) {
            throw new IllegalArgumentException("Classification confidence threshold must be between 0 and 1");
        }
        this.minimumConfidence = minimumConfidence;
    }

    public Result recommend(ComplaintClassificationProvider.Input input) {
        if (!enabled || providers.size() != 1 || !validInput(input)) return unavailable();

        try {
            ComplaintClassificationProvider.Recommendation recommendation = providers.getFirst().recommend(input);
            if (!validRecommendation(recommendation)) return unavailable();
            Status status = recommendation.confidence() >= minimumConfidence
                    ? Status.RECOMMENDATION_AVAILABLE : Status.MANUAL_REVIEW_REQUIRED;
            return new Result(status, recommendation.category(), recommendation.department(),
                    recommendation.priority(), recommendation.confidence(), recommendation.explanation());
        } catch (RuntimeException exception) {
            // Do not log complaint text or provider exception messages, which may contain citizen data.
            return unavailable();
        }
    }

    private boolean validInput(ComplaintClassificationProvider.Input input) {
        return input != null && input.title() != null && !input.title().isBlank() && input.title().length() <= 150
                && input.description() != null && !input.description().isBlank() && input.description().length() <= 2000
                && input.location() != null && !input.location().isBlank() && input.location().length() <= 255;
    }

    private boolean validRecommendation(ComplaintClassificationProvider.Recommendation recommendation) {
        return recommendation != null && CATEGORIES.contains(recommendation.category())
                && recommendation.department() != null && PRIORITIES.contains(recommendation.priority())
                && Double.isFinite(recommendation.confidence())
                && recommendation.confidence() >= 0 && recommendation.confidence() <= 1
                && recommendation.explanation() != null && !recommendation.explanation().isBlank()
                && recommendation.explanation().length() <= 500;
    }

    private Result unavailable() {
        return new Result(Status.UNAVAILABLE, null, null, null, null,
                "Classification is unavailable; choose a category and priority manually.");
    }

    public enum Status { RECOMMENDATION_AVAILABLE, MANUAL_REVIEW_REQUIRED, UNAVAILABLE }

    public record Result(Status status, String category, Department department, String priority,
                         Double confidence, String explanation) {}
}

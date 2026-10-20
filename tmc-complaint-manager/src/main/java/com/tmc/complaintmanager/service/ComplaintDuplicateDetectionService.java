package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Conservative, explainable lexical/location suggestions; this is not an AI or semantic model. */
@Service
public class ComplaintDuplicateDetectionService {
    private static final Set<String> ACTIVE_STATUSES = Set.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED");
    private final ComplaintRepository complaints;
    @Value("${app.duplicates.lookback-days:30}") private int lookbackDays = 30;
    @Value("${app.duplicates.minimum-score:0.40}") private double minimumScore = 0.40;
    @Value("${app.duplicates.location-radius-meters:1000}") private double locationRadiusMeters = 1000;

    public ComplaintDuplicateDetectionService(ComplaintRepository complaints) {
        this.complaints = complaints;
    }

    public List<Suggestion> findPossibleDuplicates(Complaint draft) {
        if (draft.getCategory() == null || draft.getTitle() == null || draft.getDescription() == null
                || draft.getLocation() == null) return List.of();
        LocalDateTime since = LocalDateTime.now().minusDays(lookbackDays);
        Set<String> draftWords = words(draft.getTitle() + " " + draft.getDescription());
        Set<String> draftLocation = words(draft.getLocation());
        if (draftWords.isEmpty()) return List.of();

        return complaints.findTop100ByCategoryAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc(
                        draft.getCategory().toUpperCase(Locale.ROOT), ACTIVE_STATUSES, since).stream()
                .filter(existing -> ACTIVE_STATUSES.contains(existing.getStatus()))
                .map(existing -> score(draft, draftWords, draftLocation, existing))
                .filter(suggestion -> suggestion.score() >= minimumScore)
                .sorted(Comparator.comparingDouble(Suggestion::score).reversed())
                .limit(5)
                .toList();
    }

    private Suggestion score(Complaint draft, Set<String> draftWords, Set<String> draftLocation, Complaint existing) {
        double textSimilarity = jaccard(draftWords, words(existing.getTitle() + " " + existing.getDescription()));
        double locationSimilarity = jaccard(draftLocation, words(existing.getLocation()));
        double distanceMeters = distanceMeters(draft, existing);
        double geographicSimilarity = Double.isFinite(distanceMeters) && distanceMeters <= locationRadiusMeters
                ? 1 - distanceMeters / locationRadiusMeters : 0;
        double score = textSimilarity * 0.55 + locationSimilarity * 0.30 + geographicSimilarity * 0.15;
        boolean locationCorroborates = locationSimilarity >= 0.15 || geographicSimilarity > 0;
        if (textSimilarity < 0.25 || !locationCorroborates) score = 0;
        return new Suggestion(existing.getComplaintNumber(), existing.getTitle(), existing.getLocation(),
                existing.getStatus(), existing.getCreatedAt(), Math.round(score * 100) / 100.0);
    }

    private Set<String> words(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        return Arrays.stream(normalized.split("[^\\p{L}\\p{N}]+"))
                .filter(token -> token.length() > 2)
                .collect(Collectors.toSet());
    }

    private double jaccard(Set<String> first, Set<String> second) {
        if (first.isEmpty() || second.isEmpty()) return 0;
        long intersection = first.stream().filter(second::contains).count();
        long union = first.size() + second.size() - intersection;
        return union == 0 ? 0 : (double) intersection / union;
    }

    private double distanceMeters(Complaint first, Complaint second) {
        if (first.getLatitude() == null || first.getLongitude() == null
                || second.getLatitude() == null || second.getLongitude() == null) return Double.POSITIVE_INFINITY;
        double lat1 = Math.toRadians(first.getLatitude());
        double lat2 = Math.toRadians(second.getLatitude());
        double dLat = lat2 - lat1;
        double dLon = Math.toRadians(second.getLongitude() - first.getLongitude());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        // Floating-point rounding can put a just outside [0, 1], making the
        // square roots below return NaN for antipodal or nearly antipodal points.
        a = Math.max(0, Math.min(1, a));
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public record Suggestion(String complaintNumber, String title, String location, String status,
                             LocalDateTime createdAt, double score) {}
}

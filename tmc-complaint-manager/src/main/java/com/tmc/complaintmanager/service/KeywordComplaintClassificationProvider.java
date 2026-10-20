package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.Department;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Built-in intelligent multilingual keyword classification provider for municipal complaints.
 * Analyses the complaint title and description in English, Marathi (मराठी), and Hindi (हिंदी)
 * using civic terminology and weighted pattern matching to recommend appropriate department,
 * category, and priority.
 *
 * Specific grievances (such as dead animal removal, water leakage, or drainage overflows)
 * take precedence over ambient location words like road or street.
 */
@Component
public class KeywordComplaintClassificationProvider implements ComplaintClassificationProvider {

    private record WeightedPattern(Pattern pattern, double weight) {
        static WeightedPattern of(String regex, double weight) {
            return new WeightedPattern(Pattern.compile("(?U)(?i)\\b" + regex + "\\b"), weight);
        }
    }

    private record Rule(
            String category,
            Department department,
            String priority,
            double baseConfidence,
            String explanation,
            List<WeightedPattern> patterns
    ) {}

    private static final List<Rule> RULES = List.of(
            // 1. DEAD ANIMALS & CARCASS REMOVAL -> Solid Waste Management (Sanitation), HIGH priority
            new Rule("GARBAGE", Department.SOLID_WASTE, "HIGH", 0.94,
                    "Dead animal or carcass removal detected — handled urgently by Solid Waste Management (Sanitation).",
                    List.of(
                            // English
                            WeightedPattern.of("dead\\s+animal(s)?", 10.0),
                            WeightedPattern.of("animal\\s+carcass(es)?", 10.0),
                            WeightedPattern.of("carcass(es)?", 10.0),
                            WeightedPattern.of("roadkill", 10.0),
                            WeightedPattern.of("dead\\s+dog(s)?", 10.0),
                            WeightedPattern.of("dead\\s+cat(s)?", 10.0),
                            WeightedPattern.of("dead\\s+cow(s)?", 10.0),
                            WeightedPattern.of("dead\\s+ox(en)?", 10.0),
                            WeightedPattern.of("dead\\s+cattle", 10.0),
                            WeightedPattern.of("dead\\s+buffalo(es)?", 10.0),
                            WeightedPattern.of("dead\\s+bird(s)?", 10.0),
                            WeightedPattern.of("dead\\s+pigeon(s)?", 10.0),
                            WeightedPattern.of("dead\\s+rat(s)?", 10.0),
                            WeightedPattern.of("dead\\s+snake(s)?", 10.0),
                            WeightedPattern.of("dead\\s+pig(s)?", 10.0),
                            WeightedPattern.of("dead\\s+stray(s)?", 10.0),
                            WeightedPattern.of("animal\\s+body", 10.0),
                            WeightedPattern.of("animal\\s+corpse", 10.0),
                            WeightedPattern.of("decomposing\\s+animal", 10.0),
                            WeightedPattern.of("rotting\\s+animal", 10.0),
                            WeightedPattern.of("decaying\\s+animal", 10.0),
                            WeightedPattern.of("smell\\s+of\\s+dead\\s+animal", 10.0),
                            // Marathi & Hindi
                            WeightedPattern.of("मृत\\s+प्राणी", 10.0),
                            WeightedPattern.of("मेलेला\\s+प्राणी", 10.0),
                            WeightedPattern.of("मेलेला\\s+कुत्रा", 10.0),
                            WeightedPattern.of("मेलेली\\s+मांजर", 10.0),
                            WeightedPattern.of("मेलेली\\s+गाय", 10.0),
                            WeightedPattern.of("मरा\\s+हुआ\\s+जानवर", 10.0),
                            WeightedPattern.of("मरा\\s+हुआ\\s+कुत्ता", 10.0),
                            WeightedPattern.of("मरी\\s+हुई\\s+बिल्ली", 10.0),
                            WeightedPattern.of("मृत\\s+पशु", 10.0),
                            WeightedPattern.of("शव", 8.0),
                            WeightedPattern.of("melela\\s+kutra", 10.0),
                            WeightedPattern.of("mrut\\s+prani", 10.0),
                            WeightedPattern.of("mara\\s+hua\\s+janwar", 10.0)
                    )),

            // 2. DRAINAGE & SEWAGE -> Sewerage Department, HIGH priority
            new Rule("DRAINAGE", Department.SEWERAGE, "HIGH", 0.90,
                    "Keywords related to drainage, sewage blockage, open manholes, or waterlogging detected.",
                    List.of(
                            // English
                            WeightedPattern.of("sewage\\s+overflow", 10.0),
                            WeightedPattern.of("blocked\\s+drain(s)?", 10.0),
                            WeightedPattern.of("drain\\s+blockage", 10.0),
                            WeightedPattern.of("choked\\s+drain(s)?", 10.0),
                            WeightedPattern.of("open\\s+manhole(s)?", 10.0),
                            WeightedPattern.of("manhole\\s+cover", 8.0),
                            WeightedPattern.of("open\\s+gutter(s)?", 8.0),
                            WeightedPattern.of("stagnant\\s+water", 8.0),
                            WeightedPattern.of("waterlog(ged|ging)?", 8.0),
                            WeightedPattern.of("foul\\s+smell", 6.0),
                            WeightedPattern.of("drainage", 6.0),
                            WeightedPattern.of("sewage", 6.0),
                            WeightedPattern.of("sewer(s)?", 6.0),
                            WeightedPattern.of("manhole(s)?", 6.0),
                            WeightedPattern.of("gutter(s)?", 6.0),
                            WeightedPattern.of("septic\\s+tank", 6.0),
                            WeightedPattern.of("nala", 5.0),
                            WeightedPattern.of("nalla", 5.0),
                            WeightedPattern.of("drain(s)?", 4.0),
                            // Marathi & Hindi
                            WeightedPattern.of("गटार", 8.0),
                            WeightedPattern.of("गटारे", 8.0),
                            WeightedPattern.of("तुंबलेली\\s+गटार", 10.0),
                            WeightedPattern.of("सांडपाणी", 8.0),
                            WeightedPattern.of("मॅनहोल", 8.0),
                            WeightedPattern.of("उघडे\\s+मॅनहोल", 10.0),
                            WeightedPattern.of("गटाराचे\\s+झाकण", 9.0),
                            WeightedPattern.of("नाली", 7.0),
                            WeightedPattern.of("नाली\\s+बंद", 10.0),
                            WeightedPattern.of("सीवर", 8.0),
                            WeightedPattern.of("सीवर\\s+ओवरफ्लो", 10.0),
                            WeightedPattern.of("जलभराव", 8.0),
                            WeightedPattern.of("गंदा\\s+नाला", 8.0),
                            WeightedPattern.of("gatar", 7.0),
                            WeightedPattern.of("sandpani", 7.0),
                            WeightedPattern.of("tumbleli\\s+gatar", 10.0)
                    )),

            // 3. WATER SUPPLY & PIPELINE LEAKS -> Water Department, HIGH priority
            new Rule("WATER", Department.WATER, "HIGH", 0.90,
                    "Keywords related to water supply, pipeline leaks, or drinking water quality detected.",
                    List.of(
                            // English
                            WeightedPattern.of("pipe\\s+burst", 10.0),
                            WeightedPattern.of("burst\\s+pipe", 10.0),
                            WeightedPattern.of("water\\s+leak(age)?", 10.0),
                            WeightedPattern.of("pipeline\\s+leak(age)?", 10.0),
                            WeightedPattern.of("leaking\\s+pipe(s)?", 10.0),
                            WeightedPattern.of("pipe\\s+leak(s)?", 10.0),
                            WeightedPattern.of("drinking\\s+water", 8.0),
                            WeightedPattern.of("water\\s+shortage", 8.0),
                            WeightedPattern.of("no\\s+water", 8.0),
                            WeightedPattern.of("contaminated\\s+water", 8.0),
                            WeightedPattern.of("dirty\\s+water", 8.0),
                            WeightedPattern.of("muddy\\s+water", 8.0),
                            WeightedPattern.of("water\\s+supply", 7.0),
                            WeightedPattern.of("pipeline(s)?", 6.0),
                            WeightedPattern.of("borewell", 6.0),
                            WeightedPattern.of("water\\s+tanker", 6.0),
                            WeightedPattern.of("water\\s+meter", 6.0),
                            WeightedPattern.of("tap\\s+water", 5.0),
                            WeightedPattern.of("paani", 5.0),
                            WeightedPattern.of("water", 3.0),
                            // Marathi & Hindi
                            WeightedPattern.of("पाणी\\s+गळती", 10.0),
                            WeightedPattern.of("नळ\\s+गळती", 9.0),
                            WeightedPattern.of("पाईप\\s+फुटला", 10.0),
                            WeightedPattern.of("पाणीपुरवठा\\s+बंद", 9.0),
                            WeightedPattern.of("दूषित\\s+पाणी", 9.0),
                            WeightedPattern.of("गढूळ\\s+पाणी", 9.0),
                            WeightedPattern.of("पाणी\\s+टंचाई", 8.0),
                            WeightedPattern.of("पिण्याचे\\s+पाणी", 8.0),
                            WeightedPattern.of("पानी\\s+लीकेज", 10.0),
                            WeightedPattern.of("पाइप\\s+फटा", 10.0),
                            WeightedPattern.of("पानी\\s+नहीं\\s+आ\\s+रहा", 9.0),
                            WeightedPattern.of("गंदा\\s+पानी", 9.0),
                            WeightedPattern.of("जल\\s+आपूर्ति", 8.0),
                            WeightedPattern.of("pani\\s+galti", 10.0),
                            WeightedPattern.of("pipe\\s+futla", 10.0),
                            WeightedPattern.of("pani\\s+nahi", 8.0)
                    )),

            // 4. GARBAGE & SANITATION -> Solid Waste Department, MEDIUM priority
            new Rule("GARBAGE", Department.SOLID_WASTE, "MEDIUM", 0.88,
                    "Keywords related to garbage disposal, trash accumulation, or public cleanliness detected.",
                    List.of(
                            // English
                            WeightedPattern.of("garbage\\s+dump(ing)?", 10.0),
                            WeightedPattern.of("overflowing\\s+bin(s)?", 10.0),
                            WeightedPattern.of("solid\\s+waste", 8.0),
                            WeightedPattern.of("plastic\\s+waste", 8.0),
                            WeightedPattern.of("unhygienic", 7.0),
                            WeightedPattern.of("dustbin(s)?", 7.0),
                            WeightedPattern.of("garbage", 7.0),
                            WeightedPattern.of("waste", 6.0),
                            WeightedPattern.of("trash", 6.0),
                            WeightedPattern.of("rubbish", 6.0),
                            WeightedPattern.of("litter", 6.0),
                            WeightedPattern.of("debris", 6.0),
                            WeightedPattern.of("sanitation", 6.0),
                            WeightedPattern.of("kachra", 6.0),
                            WeightedPattern.of("kachara", 6.0),
                            WeightedPattern.of("ghanta\\s+gadi", 6.0),
                            WeightedPattern.of("cleaning", 5.0),
                            WeightedPattern.of("sweeping", 5.0),
                            WeightedPattern.of("sweeper", 5.0),
                            WeightedPattern.of("filth", 5.0),
                            // Marathi & Hindi
                            WeightedPattern.of("कचरा", 8.0),
                            WeightedPattern.of("कचऱ्याचा\\s+ढीग", 10.0),
                            WeightedPattern.of("कचरा\\s+कुंडी", 8.0),
                            WeightedPattern.of("घाण", 6.0),
                            WeightedPattern.of("घंटा\\s+गाडी", 7.0),
                            WeightedPattern.of("झाडू", 6.0),
                            WeightedPattern.of("स्वच्छता", 6.0),
                            WeightedPattern.of("कूड़ा", 8.0),
                            WeightedPattern.of("कूड़ेदान", 8.0),
                            WeightedPattern.of("कूड़े\\s+का\\s+ढेर", 10.0),
                            WeightedPattern.of("गंदगी", 7.0),
                            WeightedPattern.of("सफाई", 6.0),
                            WeightedPattern.of("kachra\\s+dhig", 10.0)
                    )),

            // 5. STREET LIGHTING -> Street Lighting Department, MEDIUM priority
            new Rule("STREET_LIGHT", Department.STREET_LIGHTING, "MEDIUM", 0.89,
                    "Keywords related to non-functional street lights or dark public areas detected.",
                    List.of(
                            // English
                            WeightedPattern.of("street\\s+light(s)?", 10.0),
                            WeightedPattern.of("streetlight(s)?", 10.0),
                            WeightedPattern.of("street\\s+lamp(s)?", 10.0),
                            WeightedPattern.of("lamp\\s+post(s)?", 10.0),
                            WeightedPattern.of("pole\\s+light(s)?", 10.0),
                            WeightedPattern.of("dark\\s+street", 8.0),
                            WeightedPattern.of("flickering\\s+light", 8.0),
                            WeightedPattern.of("broken\\s+light(s)?", 8.0),
                            WeightedPattern.of("light\\s+not\\s+working", 8.0),
                            WeightedPattern.of("pathdiva", 7.0),
                            WeightedPattern.of("streetlighting", 6.0),
                            // Marathi & Hindi
                            WeightedPattern.of("पथदिवा", 10.0),
                            WeightedPattern.of("पथदिवे", 10.0),
                            WeightedPattern.of("दिवा\\s+बंद", 9.0),
                            WeightedPattern.of("लाईट\\s+बंद", 9.0),
                            WeightedPattern.of("स्ट्रीट\\s+लाईट", 9.0),
                            WeightedPattern.of("स्ट्रीट\\s+लाइट", 9.0),
                            WeightedPattern.of("बत्ती\\s+बंद", 8.0),
                            WeightedPattern.of("खंभे\\s+की\\s+लाइट", 9.0),
                            WeightedPattern.of("pathdive", 10.0),
                            WeightedPattern.of("light\\s+band", 8.0)
                    )),

            // 6. ELECTRICITY & ELECTRICAL HAZARDS -> Street Lighting / Electrical Dept, HIGH priority
            new Rule("ELECTRICITY", Department.STREET_LIGHTING, "HIGH", 0.91,
                    "Keywords related to electrical hazard, exposed wiring, or transformer fault detected.",
                    List.of(
                            // English
                            WeightedPattern.of("live\\s+wire(s)?", 10.0),
                            WeightedPattern.of("open\\s+wire(s)?", 10.0),
                            WeightedPattern.of("hanging\\s+wire(s)?", 10.0),
                            WeightedPattern.of("electric\\s+shock", 10.0),
                            WeightedPattern.of("short\\s+circuit", 10.0),
                            WeightedPattern.of("transformer\\s+spark(ing)?", 10.0),
                            WeightedPattern.of("transformer", 8.0),
                            WeightedPattern.of("sparking", 8.0),
                            WeightedPattern.of("electric\\s+pole", 7.0),
                            WeightedPattern.of("power\\s+outage", 7.0),
                            WeightedPattern.of("electrocuted", 7.0),
                            WeightedPattern.of("electricity", 5.0),
                            WeightedPattern.of("voltage", 5.0),
                            // Marathi & Hindi
                            WeightedPattern.of("उघडी\\s+तार", 10.0),
                            WeightedPattern.of("विद्युत\\s+प्रवाह", 9.0),
                            WeightedPattern.of("शॉक", 9.0),
                            WeightedPattern.of("शॉर्ट\\s+सर्किट", 10.0),
                            WeightedPattern.of("ट्रान्सफॉर्मर", 9.0),
                            WeightedPattern.of("खुला\\s+तार", 10.0),
                            WeightedPattern.of("बिजली\\s+का\\s+तार", 9.0),
                            WeightedPattern.of("करंट", 8.0),
                            WeightedPattern.of("बिजली", 6.0),
                            WeightedPattern.of("ughadi\\s+tar", 10.0)
                    )),

            // 7. ROAD DAMAGE & INFRASTRUCTURE -> Public Works Department, HIGH priority
            new Rule("ROAD", Department.PUBLIC_WORKS, "HIGH", 0.88,
                    "Keywords related to road damage, potholes, or pedestrian infrastructure detected.",
                    List.of(
                            // English
                            WeightedPattern.of("pothole(s)?", 10.0),
                            WeightedPattern.of("damaged\\s+road(s)?", 10.0),
                            WeightedPattern.of("broken\\s+road(s)?", 10.0),
                            WeightedPattern.of("caved\\s+in\\s+road", 10.0),
                            WeightedPattern.of("road\\s+cave-?in", 10.0),
                            WeightedPattern.of("road\\s+crack(s)?", 9.0),
                            WeightedPattern.of("cracked\\s+road", 9.0),
                            WeightedPattern.of("speed\\s+breaker", 9.0),
                            WeightedPattern.of("damaged\\s+divider", 9.0),
                            WeightedPattern.of("broken\\s+divider", 9.0),
                            WeightedPattern.of("damaged\\s+footpath", 9.0),
                            WeightedPattern.of("broken\\s+footpath", 9.0),
                            WeightedPattern.of("damaged\\s+pavement", 9.0),
                            WeightedPattern.of("broken\\s+pavement", 9.0),
                            WeightedPattern.of("road\\s+repair(s)?", 8.0),
                            WeightedPattern.of("road\\s+resurfacing", 8.0),
                            WeightedPattern.of("road\\s+sinking", 8.0),
                            WeightedPattern.of("uneven\\s+road", 8.0),
                            WeightedPattern.of("bad\\s+road", 7.0),
                            WeightedPattern.of("road\\s+condition", 7.0),
                            WeightedPattern.of("asphalt", 6.0),
                            WeightedPattern.of("tar\\s+road", 6.0),
                            WeightedPattern.of("bitumen", 6.0),
                            WeightedPattern.of("divider", 5.0),
                            WeightedPattern.of("footpath", 5.0),
                            WeightedPattern.of("pavement", 5.0),
                            // Marathi & Hindi
                            WeightedPattern.of("खड्डा", 10.0),
                            WeightedPattern.of("खड्डे", 10.0),
                            WeightedPattern.of("तुटलेला\\s+रस्ता", 10.0),
                            WeightedPattern.of("रस्ता\\s+खराब", 9.0),
                            WeightedPattern.of("रस्त्यावर\\s+खड्डा", 10.0),
                            WeightedPattern.of("डामरीकरण", 8.0),
                            WeightedPattern.of("पादचारी\\s+मार्ग", 8.0),
                            WeightedPattern.of("गड्ढा", 10.0),
                            WeightedPattern.of("गड्ढे", 10.0),
                            WeightedPattern.of("सड़क\\s+पर\\s+गड्ढा", 10.0),
                            WeightedPattern.of("टूटी\\s+सड़क", 10.0),
                            WeightedPattern.of("सड़क\\s+खराब", 9.0),
                            WeightedPattern.of("सड़क\\s+मरम्मत", 8.0),
                            WeightedPattern.of("khadda", 10.0),
                            WeightedPattern.of("khadde", 10.0),
                            WeightedPattern.of("gaddha", 10.0),
                            WeightedPattern.of("gaddhe", 10.0),
                            // Ambient road/street mention has low weight so specific issues on a road won't be overridden
                            WeightedPattern.of("road(s)?", 1.0),
                            WeightedPattern.of("street(s)?", 1.0),
                            WeightedPattern.of("highway(s)?", 1.0),
                            WeightedPattern.of("रस्ता", 1.0),
                            WeightedPattern.of("सड़क", 1.0),
                            WeightedPattern.of("rasta", 1.0),
                            WeightedPattern.of("sadak", 1.0)
                    )),

            // 8. OTHER -> Manual Review Fallback
            new Rule("OTHER", Department.OTHER, "LOW", 0.70,
                    "No specific municipal category matched; flagged for manual review.",
                    List.of())
    );

    @Override
    public Recommendation recommend(Input input) {
        String combined = (input.title() + " " + input.description());

        Rule bestRule = null;
        double bestScore = 0.0;

        for (Rule rule : RULES) {
            if (rule.patterns().isEmpty()) continue;

            double ruleScore = 0.0;
            int matchCount = 0;

            for (WeightedPattern wp : rule.patterns()) {
                if (wp.pattern().matcher(combined).find()) {
                    ruleScore += wp.weight();
                    matchCount++;
                }
            }

            if (matchCount == 0) continue;

            if (ruleScore > bestScore) {
                bestScore = ruleScore;
                bestRule = rule;
            }
        }

        // If no rule matched with meaningful score (or nothing matched at all), fallback to OTHER
        if (bestRule == null || bestScore < 2.0) {
            Rule other = RULES.getLast();
            return new Recommendation(other.category(), other.department(),
                    escalatePriority(combined.toLowerCase(Locale.ROOT), other.priority()),
                    other.baseConfidence(), other.explanation());
        }

        // Calculate confidence: baseConfidence scaled by score strength, bounded in [0.65, 0.95]
        double confidence = bestRule.baseConfidence();
        if (bestScore >= 10.0) {
            confidence = Math.min(0.95, bestRule.baseConfidence() + 0.03);
        } else if (bestScore < 5.0) {
            confidence = Math.max(0.65, bestRule.baseConfidence() - 0.10);
        }
        confidence = Math.round(confidence * 100.0) / 100.0;

        String priority = escalatePriority(combined.toLowerCase(Locale.ROOT), bestRule.priority());

        return new Recommendation(bestRule.category(), bestRule.department(), priority, confidence, bestRule.explanation());
    }

    /**
     * Bumps priority to HIGH if the complaint text contains emergency/urgency signals,
     * regardless of the base rule priority.
     */
    private String escalatePriority(String combined, String basePriority) {
        List<String> urgencySignals = List.of(
                "urgent", "urgently", "emergency", "danger", "dangerous", "accident", "injury",
                "injured", "fire", "electrocuted", "shock",
                "immediately", "serious", "severe", "critical", "hazard", "hazardous", "dying",
                "तातडीने", "तातडीची", "धोकादायक", "अपघात", "आग", "गंभीर", "कठोर",
                "तुरंत", "आपातकालीन", "खतरनाक", "दुर्घटना"
        );
        for (String signal : urgencySignals) {
            if (combined.contains(signal)) return "HIGH";
        }
        return basePriority;
    }
}

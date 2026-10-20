package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.service.ComplaintClassificationProvider;
import com.tmc.complaintmanager.service.KeywordComplaintClassificationProvider;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Unit tests for the built-in keyword classification provider. */
class KeywordComplaintClassificationProviderTests {

    private final KeywordComplaintClassificationProvider provider = new KeywordComplaintClassificationProvider();

    private ComplaintClassificationProvider.Input input(String title, String description) {
        return new ComplaintClassificationProvider.Input(title, description, "Test Location");
    }

    @Test
    void classifiesDeadAnimalOnRoadAsGarbageSolidWasteHigh() {
        // Specifically tests that dead animal grievance takes precedence over the ambient word "road"
        var result = provider.recommend(input("Dead animal on the road", "There is a dead animal on the road"));
        assertEquals("GARBAGE", result.category());
        assertEquals(Department.SOLID_WASTE, result.department());
        assertEquals("HIGH", result.priority());
        assertTrue(result.confidence() >= 0.85);
        assertTrue(result.explanation().toLowerCase().contains("dead animal") || result.explanation().toLowerCase().contains("carcass"));
    }

    @Test
    void classifiesDeadDogCarcassAsGarbageSolidWaste() {
        var result = provider.recommend(input("Dead dog near signal", "A dog carcass is lying on the footpath since yesterday"));
        assertEquals("GARBAGE", result.category());
        assertEquals(Department.SOLID_WASTE, result.department());
        assertEquals("HIGH", result.priority());
    }

    @Test
    void classifiesRoadPotholeAsPublicWorksHigh() {
        var result = provider.recommend(input("Pothole on main road", "There is a large pothole near the traffic signal damaging vehicles."));
        assertEquals("ROAD", result.category());
        assertEquals(Department.PUBLIC_WORKS, result.department());
        assertEquals("HIGH", result.priority());
        assertTrue(result.confidence() >= 0.80);
    }

    @Test
    void classifiesWaterLeakOnRoadAsWaterDepartment() {
        // Water leak on a road must be routed to WATER, not ROAD
        var result = provider.recommend(input("Water pipe leak on main road", "Drinking water pipe burst on the road, water flooding everywhere."));
        assertEquals("WATER", result.category());
        assertEquals(Department.WATER, result.department());
        assertTrue(result.confidence() >= 0.80);
    }

    @Test
    void classifiesDrainageBlockageAsSewerage() {
        var result = provider.recommend(input("Blocked drain on street", "Sewage drain is blocked and there is stagnant water causing foul smell."));
        assertEquals("DRAINAGE", result.category());
        assertEquals(Department.SEWERAGE, result.department());
    }

    @Test
    void classifiesGarbageDumpAsSolidWaste() {
        var result = provider.recommend(input("Garbage pile on road", "Huge pile of garbage and trash near the bus stop causing unhygienic conditions."));
        assertEquals("GARBAGE", result.category());
        assertEquals(Department.SOLID_WASTE, result.department());
    }

    @Test
    void classifiesStreetLightAsStreetLighting() {
        var result = provider.recommend(input("Street light not working", "The lamp post on our street is dark at night; bulb is broken."));
        assertEquals("STREET_LIGHT", result.category());
        assertEquals(Department.STREET_LIGHTING, result.department());
    }

    @Test
    void classifiesLiveWireAsElectricity() {
        var result = provider.recommend(input("Live wire hanging", "Open live electric wire hanging from pole near school, danger of electric shock."));
        assertEquals("ELECTRICITY", result.category());
        assertEquals(Department.STREET_LIGHTING, result.department());
        assertEquals("HIGH", result.priority());
    }

    @Test
    void escalatesToHighPriorityOnUrgencyKeywords() {
        var result = provider.recommend(input("Garbage emergency", "Dangerous garbage pile catching fire — urgent removal required."));
        assertEquals("HIGH", result.priority());
    }

    @Test
    void returnsOtherForCompletelyUnrecognisedText() {
        var result = provider.recommend(input("Random issue", "Something happened at a location and I need help with this unspecified matter."));
        assertEquals("OTHER", result.category());
        assertEquals(Department.OTHER, result.department());
        assertTrue(result.confidence() >= 0.60);
    }

    @Test
    void confidenceIsWithinValidRange() {
        var result = provider.recommend(input("Water shortage in colony", "No water supply for 3 days; tanker not arriving."));
        assertTrue(result.confidence() >= 0 && result.confidence() <= 1.0, "Confidence must be in [0,1]");
    }

    @Test
    void classifiesMarathiPotholeAsRoadPublicWorks() {
        var result = provider.recommend(input("रस्त्यावर मोठा खड्डा", "घोडबंदर रोडवर वाहनांना धोकादायक खड्डा पडला आहे"));
        assertEquals("ROAD", result.category());
        assertEquals(Department.PUBLIC_WORKS, result.department());
        assertEquals("HIGH", result.priority());
    }

    @Test
    void classifiesMarathiDeadAnimalAsGarbageSolidWaste() {
        var result = provider.recommend(input("रस्त्यावर मेलेला कुत्रा", "कपूरबावडी येथे रस्त्यावर मेलेला कुत्रा पडून आहे, दुर्गंधी येत आहे"));
        assertEquals("GARBAGE", result.category());
        assertEquals(Department.SOLID_WASTE, result.department());
        assertEquals("HIGH", result.priority());
    }

    @Test
    void classifiesHindiWaterLeakAsWaterDepartment() {
        var result = provider.recommend(input("पानी लीकेज", "मेन रोड पर पाइप फटा हुआ है और पीने का पानी बह रहा है"));
        assertEquals("WATER", result.category());
        assertEquals(Department.WATER, result.department());
    }
}

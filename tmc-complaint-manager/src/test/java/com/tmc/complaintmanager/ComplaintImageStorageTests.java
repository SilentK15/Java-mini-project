package com.tmc.complaintmanager;

import com.tmc.complaintmanager.service.ComplaintImageStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ComplaintImageStorageTests {
    @TempDir
    Path temporaryDirectory;

    @Test
    void storesOnlyDecodedPngAndReturnsOpaqueStorageKey() throws Exception {
        ComplaintImageStorage storage = new ComplaintImageStorage(temporaryDirectory.toString());
        MockMultipartFile upload = new MockMultipartFile("image", "evidence.png", "image/png", pngBytes());

        String key = storage.store(upload);

        assertTrue(key.matches("[0-9a-fA-F-]{36}\\.png"));
        assertTrue(Files.isRegularFile(storage.resolve(key)));
        assertEquals(org.springframework.http.MediaType.IMAGE_PNG, storage.mediaType(key));
    }

    @Test
    void rejectsBytesThatDoNotMatchTheirDeclaredImageType() throws Exception {
        ComplaintImageStorage storage = new ComplaintImageStorage(temporaryDirectory.toString());
        MockMultipartFile upload = new MockMultipartFile("image", "evidence.jpg", "image/jpeg", pngBytes());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> storage.store(upload));

        assertEquals(415, error.getStatusCode().value());
        try (var files = Files.list(temporaryDirectory)) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void rejectsTraversalKeysAndDeletesStoredFiles() throws Exception {
        ComplaintImageStorage storage = new ComplaintImageStorage(temporaryDirectory.toString());
        assertThrows(ResponseStatusException.class, () -> storage.resolve("..\\secret.png"));

        String key = storage.store(new MockMultipartFile("image", "evidence.png", "image/png", pngBytes()));
        storage.delete(key);

        assertFalse(Files.exists(temporaryDirectory.resolve(key)));
    }

    @Test
    void keepsPreviouslyStoredWebpEvidenceAccessibleThroughTheSafeResolver() throws Exception {
        ComplaintImageStorage storage = new ComplaintImageStorage(temporaryDirectory.toString());
        String key = "123e4567-e89b-12d3-a456-426614174000.webp";
        Files.write(temporaryDirectory.resolve(key), new byte[]{1, 2, 3});

        assertTrue(Files.isRegularFile(storage.resolve("/uploads/" + key)));
        assertEquals("image/webp", storage.mediaType(key).toString());
    }

    private byte[] pngBytes() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        image.flush();
        return output.toByteArray();
    }
}

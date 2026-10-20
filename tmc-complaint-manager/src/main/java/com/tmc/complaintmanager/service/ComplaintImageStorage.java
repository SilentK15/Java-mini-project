package com.tmc.complaintmanager.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ComplaintImageStorage {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 12_000_000L;
    private static final Pattern STORAGE_KEY = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png|webp)");
    private final Path directory;

    public ComplaintImageStorage(@Value("${app.upload-dir:uploads}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image must be 5 MB or smaller");
        }
        String extension = validateImageContent(image);
        String fileName = UUID.randomUUID() + extension;
        try {
            Files.createDirectories(directory);
            try (InputStream input = image.getInputStream()) {
                Files.copy(input, directory.resolve(fileName));
            }
            return fileName;
        } catch (IOException exception) {
            delete(fileName);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Image could not be saved");
        }
    }

    private String validateImageContent(MultipartFile image) {
        try (InputStream input = image.getInputStream(); ImageInputStream imageInput = ImageIO.createImageInputStream(input)) {
            if (imageInput == null) throw unsupportedImage();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw unsupportedImage();
            ImageReader reader = readers.next();
            try {
                reader.setInput(imageInput, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                String extension = switch (format) {
                    case "jpeg", "jpg" -> ".jpg";
                    case "png" -> ".png";
                    default -> throw unsupportedImage();
                };
                String expectedContentType = extension.equals(".jpg") ? "image/jpeg" : "image/png";
                if (!expectedContentType.equalsIgnoreCase(image.getContentType())) throw unsupportedImage();
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > MAX_IMAGE_PIXELS) {
                    throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image dimensions are too large");
                }
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw unsupportedImage();
                decoded.flush();
                return extension;
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw unsupportedImage();
        }
    }

    private ResponseStatusException unsupportedImage() {
        return new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Use a valid JPG or PNG image");
    }

    public Path resolve(String storageKey) {
        String safeKey = normalizeStorageKey(storageKey);
        if (safeKey == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        }
        Path resolved = directory.resolve(safeKey).normalize();
        if (!resolved.startsWith(directory) || !Files.isRegularFile(resolved)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        }
        return resolved;
    }

    public void delete(String storageKey) {
        String safeKey = normalizeStorageKey(storageKey);
        if (safeKey == null) return;
        try {
            Files.deleteIfExists(directory.resolve(safeKey).normalize());
        } catch (IOException ignored) {
            // Preserve the original database error; orphan cleanup is best effort.
        }
    }

    public org.springframework.http.MediaType mediaType(String storageKey) {
        if (storageKey != null && storageKey.toLowerCase(Locale.ROOT).endsWith(".png")) {
            return org.springframework.http.MediaType.IMAGE_PNG;
        }
        if (storageKey != null && storageKey.toLowerCase(Locale.ROOT).endsWith(".webp")) {
            return org.springframework.http.MediaType.parseMediaType("image/webp");
        }
        return org.springframework.http.MediaType.IMAGE_JPEG;
    }

    private String normalizeStorageKey(String storageKey) {
        if (storageKey == null) return null;
        String key = storageKey.startsWith("/uploads/") ? storageKey.substring("/uploads/".length()) : storageKey;
        if (!STORAGE_KEY.matcher(key).matches()) return null;
        try {
            UUID id = UUID.fromString(key.substring(0, 36));
            return id.toString().equalsIgnoreCase(key.substring(0, 36)) ? key : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}

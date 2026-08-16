package com.rentmyride.controller;

import com.rentmyride.custom_exceptions.PaymentFailedException;
import com.rentmyride.dtos.AuthResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final java.util.Set<String> ALLOWED_TYPES =
            java.util.Set.of("image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf");

    // Used for uploading Driving License / Aadhar photos from the customer profile & registration
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty())
            throw new PaymentFailedException("No file provided.");

        if (file.getSize() > MAX_SIZE_BYTES)
            throw new PaymentFailedException("File too large — max 5MB allowed.");

        if (!ALLOWED_TYPES.contains(file.getContentType()))
            throw new PaymentFailedException("Only JPG, PNG, WEBP, or PDF files are allowed.");

        try {
            Path uploadPath = Path.of(uploadDir);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String extension = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
            String fileName = UUID.randomUUID() + extension;

            Path targetPath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), targetPath);

            Map<String, String> result = new HashMap<>();
            result.put("url", "/uploads/" + fileName);

            return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("File uploaded.", result));
        } catch (IOException e) {
            throw new PaymentFailedException("File upload failed: " + e.getMessage());
        }
    }
}

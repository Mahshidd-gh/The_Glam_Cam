package com.Smart_mirror.controller;

import com.Smart_mirror.service.FaceRecognitionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/face")
public class FaceController {

    @Autowired
    private FaceRecognitionService faceService;

    @PostMapping("/predict")
    public ResponseEntity<String> forwardPrediction(@RequestParam("file") MultipartFile file)
            throws IOException, InterruptedException {

        // Create an HTTP client
        var client = HttpClient.newHttpClient();

        // Define a multipart boundary
        String boundary = "Boundary-" + System.currentTimeMillis();

        // Build the request
        var request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8000/predict"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(ofMultipartData(file, boundary))
                .build();

        // Send request to FastAPI
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        return ResponseEntity.ok(response.body());
    }

    private static HttpRequest.BodyPublisher ofMultipartData(MultipartFile file, String boundary) {
        try {
            var byteArrayOutputStream = new ByteArrayOutputStream();
            var writer = new PrintWriter(new OutputStreamWriter(byteArrayOutputStream, StandardCharsets.UTF_8), true);

            // Multipart header
            writer.append("--").append(boundary).append("\r\n");
            writer.append("Content-Disposition: form-data; name=\"file\"; filename=\"")
                    .append(file.getOriginalFilename()).append("\"\r\n");
            writer.append("Content-Type: ").append(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .append("\r\n\r\n");
            writer.flush();

            // File content
            byteArrayOutputStream.write(file.getBytes());
            byteArrayOutputStream.flush();
            writer.append("\r\n").flush();

            // End boundary
            writer.append("--").append(boundary).append("--").append("\r\n");
            writer.close();

            return HttpRequest.BodyPublishers.ofByteArray(byteArrayOutputStream.toByteArray());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @PostMapping("/detect")
    public String detectFace(@RequestParam("image") MultipartFile image) throws Exception {
        int count = faceService.detectFaces(image.getBytes());
        return "Faces detected: " + count;
    }
}

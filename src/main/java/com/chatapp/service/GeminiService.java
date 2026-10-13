package com.chatapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash-lite}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Retrieves a response from the AI model asynchronously with automatic retries and model fallbacks.
     *
     * @param prompt The user's input prompt
     * @return A CompletableFuture containing the AI's response text.
     */
    public CompletableFuture<String> getAiResponseAsync(String prompt) {
        return CompletableFuture.supplyAsync(() -> {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                return "Error: GEMINI_API_KEY is not configured in the environment variables.";
            }

            // Build candidate models: lowest token burn first (gemini-2.5-flash-lite), followed by gemini-2.5-flash and gemini-3.8-flash
            List<String> candidateModels = new ArrayList<>();
            String configured = (model != null && !model.isBlank()) ? model.trim() : "gemini-2.5-flash-lite";
            candidateModels.add(configured);

            if (!configured.equalsIgnoreCase("gemini-2.5-flash-lite")) {
                candidateModels.add("gemini-2.5-flash-lite");
            }
            if (!configured.equalsIgnoreCase("gemini-2.5-flash")) {
                candidateModels.add("gemini-2.5-flash");
            }
            if (!configured.equalsIgnoreCase("gemini-3.8-flash")) {
                candidateModels.add("gemini-3.8-flash");
            }

            String lastErrorMessage = null;

            for (String targetModel : candidateModels) {
                // Try up to 2 attempts per candidate model
                for (int attempt = 1; attempt <= 2; attempt++) {
                    try {
                        String responseText = callGeminiApi(targetModel, prompt);
                        if (responseText != null && !responseText.isBlank()) {
                            if (!targetModel.equalsIgnoreCase(configured)) {
                                log.info("Successfully answered using fallback model: {}", targetModel);
                            }
                            return responseText;
                        }
                    } catch (HttpStatusCodeException ex) {
                        int statusCode = ex.getStatusCode().value();
                        log.warn("Gemini model {} returned HTTP {} (attempt {}): {}", targetModel, statusCode, attempt, ex.getMessage());

                        // If 503 (high demand) or 429 (rate limit), pause briefly before retry
                        if (statusCode == 503 || statusCode == 429) {
                            lastErrorMessage = "Google Gemini is currently experiencing temporary high demand. Please try again in a moment.";
                            try {
                                Thread.sleep(attempt * 1000L);
                            } catch (InterruptedException ignored) {
                                Thread.currentThread().interrupt();
                            }
                            continue;
                        }

                        // For 404 (model deprecated/not found) or 400, switch immediately to next candidate
                        lastErrorMessage = parseErrorMessage(ex.getResponseBodyAsString(), ex.getMessage());
                        break;
                    } catch (Exception ex) {
                        log.warn("Gemini model {} call failed (attempt {}): {}", targetModel, attempt, ex.getMessage());
                        lastErrorMessage = ex.getMessage();
                        try {
                            Thread.sleep(800L);
                        } catch (InterruptedException ignored) {
                            Thread.currentThread().interrupt();
                        }
                    }
                }
            }

            return lastErrorMessage != null ? lastErrorMessage : "Google Gemini is temporarily unavailable. Please try again later.";
        });
    }

    private String callGeminiApi(String targetModel, String prompt) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey;

        ObjectNode request = mapper.createObjectNode();
        ArrayNode contents = request.putArray("contents");
        ObjectNode content = contents.addObject();
        ArrayNode parts = content.putArray("parts");
        parts.addObject().put("text", prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(request.toString(), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = mapper.readTree(response.getBody());
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (!textNode.isMissingNode()) {
                return textNode.asText();
            }
        }
        return null;
    }

    private String parseErrorMessage(String body, String defaultMsg) {
        if (body != null && !body.isBlank()) {
            try {
                JsonNode root = mapper.readTree(body);
                String msg = root.path("error").path("message").asText(null);
                if (msg != null && !msg.isBlank()) {
                    return msg;
                }
            } catch (Exception ignored) {}
        }
        return defaultMsg;
    }
}

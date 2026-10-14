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

    @Value("${gemini.model:gemini-3.5-flash-lite}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Retrieves a response from the AI model asynchronously with automatic model fallbacks.
     *
     * <p>Fallback chain (as of October 2026, per https://ai.google.dev/gemini-api/docs/models):
     * <ol>
     *   <li>Configured model (default: gemini-3.5-flash-lite) — fastest, most cost-effective free-tier model</li>
     *   <li>gemini-3.8-flash — most capable stable Flash model</li>
     *   <li>gemini-3.6-flash — previous-generation stable Flash</li>
     *   <li>gemini-3.1-flash-lite — last-resort lightweight fallback</li>
     * </ol>
     * Note: gemini-2.5-x and older models are limited to existing users only and have been removed
     * from the fallback chain. gemini-2.0-flash and gemini-1.5-flash are no longer listed in the
     * Google AI Studio model catalogue.
     *
     * @param prompt The user's input prompt
     * @return A CompletableFuture containing the AI's response text.
     */
    public CompletableFuture<String> getAiResponseAsync(String prompt) {
        return CompletableFuture.supplyAsync(() -> {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                return "Error: GEMINI_API_KEY is not configured in the environment variables.";
            }

            // Active free-tier text-generation models (newest-stable first, cheapest primary)
            // Source: https://ai.google.dev/gemini-api/docs/models (verified October 2026)
            List<String> candidateModels = new ArrayList<>();
            String configured = (model != null && !model.isBlank()) ? model.trim() : "gemini-3.5-flash-lite";
            candidateModels.add(configured);

            // Fallback order: fast flagship -> previous gen stable -> lite fallback
            String[] standardFallbacks = {"gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"};
            for (String fallback : standardFallbacks) {
                if (candidateModels.stream().noneMatch(m -> m.equalsIgnoreCase(fallback))) {
                    candidateModels.add(fallback);
                }
            }

            String lastErrorMessage = null;

            for (String targetModel : candidateModels) {
                try {
                    String responseText = callGeminiApi(targetModel, prompt);
                    if (responseText != null && !responseText.isBlank()) {
                        if (!targetModel.equalsIgnoreCase(configured)) {
                            log.info("Successfully answered using fallback Gemini model: {}", targetModel);
                        }
                        return responseText;
                    }
                } catch (HttpStatusCodeException ex) {
                    int statusCode = ex.getStatusCode().value();
                    String responseBody = ex.getResponseBodyAsString();
                    String apiErrorMessage = parseErrorMessage(responseBody, ex.getMessage());
                    log.warn("Gemini model {} returned HTTP {}: {}", targetModel, statusCode, apiErrorMessage);

                    lastErrorMessage = switch (statusCode) {
                        case 503 ->
                            // Google infrastructure overloaded; immediately try next fallback model
                            "Google Gemini is currently experiencing high demand. Please try again in a moment.";
                        case 429 ->
                            // Rate limit or quota exhausted; Google's message is most informative
                            apiErrorMessage != null ? apiErrorMessage
                                    : "Gemini API rate limit or quota exceeded. Please check your Google AI Studio quota.";
                        default ->
                            // 404 (model not found) or 400 (bad request) — move to next candidate
                            apiErrorMessage;
                    };
                } catch (Exception ex) {
                    log.warn("Gemini model {} call failed: {}", targetModel, ex.getMessage());
                    lastErrorMessage = ex.getMessage();
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
            } catch (com.fasterxml.jackson.core.JsonProcessingException ignored) {}
        }
        return defaultMsg;
    }
}

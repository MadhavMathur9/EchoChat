package com.chatapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.concurrent.CompletableFuture;

@Service
public class GeminiService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Retrieves a response from the AI model asynchronously.
     *
     * @param prompt The user's input prompt
     * @return A CompletableFuture containing the AI's response text.
     */
    public CompletableFuture<String> getAiResponseAsync(String prompt) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (apiKey == null || apiKey.trim().isEmpty()) {
                    return "Error: GEMINI_API_KEY is not configured in the environment variables.";
                }
                
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
                
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
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(response.getBody());
                    return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                } else {
                    return "Sorry, the API returned an error: " + response.getStatusCode();
                }
            } catch (Exception e) {
                return "Sorry, I encountered an error: " + e.getMessage();
            }
        });
    }
}

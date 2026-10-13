package com.chatapp.controller;

import com.chatapp.dto.DemoRequest;
import com.chatapp.dto.DemoResponse;
import com.chatapp.service.GeminiService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/demo")
@RequiredArgsConstructor
@Slf4j
public class DemoController {

    private final GeminiService geminiService;
    private final StringRedisTemplate redisTemplate;

    // In-memory fallback rate limiter if Redis is unavailable
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<Long>> inMemoryRateLimiter = new ConcurrentHashMap<>();

    private DefaultRedisScript<Long> rateLimiterScript;

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            rateLimiterScript = new DefaultRedisScript<>();
            rateLimiterScript.setLocation(new ClassPathResource("scripts/rate_limiter.lua"));
            rateLimiterScript.setResultType(Long.class);
        } catch (Exception e) {
            log.warn("Failed to load rate limiter script for Redis: {}", e.getMessage());
        }
    }

    @PostMapping("/gemini")
    public ResponseEntity<?> runDemoPrompt(@Valid @RequestBody DemoRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        
        boolean allowed = checkRateLimit(clientIp);
        if (!allowed) {
            log.warn("Demo rate limit exceeded for IP: {}", clientIp);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "RATE_LIMIT_EXCEEDED",
                            "message", "Now check out the product! You have made more than 15 demo requests in the last minute."
                    ));
        }

        String prompt = request.prompt().replaceFirst("(?i)@gemini", "").trim();
        if (prompt.isEmpty()) {
            prompt = "Introduce EchoChat real-time chat with Google Gemini briefly in 2 sentences.";
        }

        try {
            String aiResponse = geminiService.getAiResponseAsync(prompt).get(15, TimeUnit.SECONDS);
            return ResponseEntity.ok(new DemoResponse(aiResponse, false));
        } catch (Exception e) {
            log.error("Error executing Gemini demo prompt", e);
            return ResponseEntity.ok(new DemoResponse(
                    "EchoChat combines lightweight ephemeral rooms with live Google Gemini AI. Everything vanishes automatically after 10 minutes of inactivity!",
                    false
            ));
        }
    }

    private boolean checkRateLimit(String clientIp) {
        try {
            if (redisTemplate != null && rateLimiterScript != null) {
                String key = "rate_limit:demo:ip:" + clientIp;
                Long result = redisTemplate.execute(
                        rateLimiterScript,
                        Collections.singletonList(key),
                        "15", "60" // 15 requests per 60 seconds (1 minute)
                );
                if (result != null) {
                    return result == 1L;
                }
            }
        } catch (Exception e) {
            log.warn("Redis rate limiter check failed, falling back to in-memory: {}", e.getMessage());
        }

        // In-memory fallback rate limiting (15 requests per 60s)
        long now = System.currentTimeMillis();
        CopyOnWriteArrayList<Long> timestamps = inMemoryRateLimiter.computeIfAbsent(clientIp, k -> new CopyOnWriteArrayList<>());
        timestamps.removeIf(t -> now - t > 60_000);
        
        if (timestamps.size() >= 15) {
            return false;
        }

        timestamps.add(now);
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}

package com.chatapp.websocket;

import com.chatapp.dto.ErrorDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
@Slf4j
public class RateLimiterInterceptor implements ChannelInterceptor {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final DefaultRedisScript<Long> rateLimiterScript;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RateLimiterInterceptor.class);

    public RateLimiterInterceptor(StringRedisTemplate redisTemplate, SimpMessagingTemplate messagingTemplate) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.rateLimiterScript = new DefaultRedisScript<>();
        this.rateLimiterScript.setLocation(new ClassPathResource("scripts/rate_limiter.lua"));
        this.rateLimiterScript.setResultType(Long.class);
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            String sessionId = accessor.getSessionId();
            if (sessionId == null) {
                return message;
            }

            String key = "rate_limit:session:" + sessionId;
            Long result = redisTemplate.execute(
                    rateLimiterScript,
                    Collections.singletonList(key),
                    "10", "1" // 10 messages per 1 second
            );

            if (result != null && result == 0L) {
                log.warn("Rate limit exceeded for session: {}", sessionId);
                messagingTemplate.convertAndSendToUser(
                        sessionId,
                        "/queue/errors",
                        new ErrorDTO("RATE_LIMIT_EXCEEDED", "You are sending messages too fast.")
                );
                // Return null to drop the message
                return null;
            }
        }
        return message;
    }
}

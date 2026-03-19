package com.chatapp.websocket;

import com.chatapp.domain.Message;
import com.chatapp.domain.SenderType;
import com.chatapp.dto.ChatMessagePayload;
import com.chatapp.dto.MessageDTO;
import com.chatapp.dto.MessageMapper;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.RoomRepository;
import com.github.f4b6a3.uuid.UuidCreator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.chatapp.domain.Room;
import com.chatapp.service.GeminiService;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

import java.time.Instant;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatMessageHandler {

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageMapper messageMapper;
    private final StringRedisTemplate redisTemplate;
    private final GeminiService geminiService;

    @MessageMapping("/chat/{roomId}")
    @Transactional
    public void handleMessage(@DestinationVariable String roomId,
                              @Payload ChatMessagePayload payload,
                              SimpMessageHeaderAccessor accessor) {
        
        String userId = accessor.getFirstNativeHeader("userId");
        String displayName = accessor.getFirstNativeHeader("displayName");

        if (userId == null || displayName == null) {
            log.warn("Missing userId or displayName in message headers");
            return;
        }

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));

        room.setLastActiveAt(Instant.now());
        roomRepository.save(room);

        String sanitizedContent = Jsoup.clean(payload.content() != null ? payload.content() : "", Safelist.none());

        // 1. Persist Message
        Message message = Message.builder()
                .id(UuidCreator.getTimeOrderedEpoch())
                .room(room)
                .senderUuid(userId)
                .senderName(displayName)
                .senderType(SenderType.USER)
                .content(sanitizedContent)
                .timestamp(Instant.now())
                .build();
                
        message = messageRepository.save(message);

        // 2. Update room:{roomId}:last_active in Redis
        redisTemplate.opsForValue().set("room:" + roomId + ":last_active", 
                String.valueOf(Instant.now().toEpochMilli()));

        // 3. Broadcast to room
        MessageDTO dto = messageMapper.toDto(message);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, dto);

        // 4. (Future Phase) Async Gemini call will happen here if content.startsWith("@gemini")
        if (sanitizedContent.trim().toLowerCase().startsWith("@gemini")) {
            String prompt = sanitizedContent.trim().substring(7).trim();
            if (!prompt.isEmpty()) {
                // Send an optimistic typing indicator if desired, or just wait for the response
                geminiService.getAiResponseAsync(prompt).thenAccept(response -> {
                    try {
                        Room aiRoom = roomRepository.findById(roomId).orElse(null);
                        if (aiRoom == null) return;
                        
                        Message aiMessage = Message.builder()
                                .id(UuidCreator.getTimeOrderedEpoch())
                                .room(aiRoom)
                                .senderUuid("gemini-bot")
                                .senderName("Gemini")
                                .senderType(SenderType.GEMINI)
                                .content(response)
                                .timestamp(Instant.now())
                                .build();
                                
                        aiMessage = messageRepository.save(aiMessage);
                        MessageDTO aiDto = messageMapper.toDto(aiMessage);
                        messagingTemplate.convertAndSend("/topic/room/" + roomId, aiDto);
                    } catch (Exception e) {
                        log.error("Failed to send AI response", e);
                    }
                });
            }
        }
    }
}

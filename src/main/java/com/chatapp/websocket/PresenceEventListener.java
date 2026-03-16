package com.chatapp.websocket;

import com.chatapp.domain.Room;
import com.chatapp.dto.ErrorDTO;
import com.chatapp.dto.PresenceDTO;
import com.chatapp.repository.RoomRepository;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomRepository roomRepository;

    private final LoadingCache<String, Integer> maxUsersCache = CacheBuilder.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public Integer load(String roomId) {
                    Room room = roomRepository.findById(roomId).orElse(null);
                    return room != null ? room.getMaxUsers() : 50; // default to 50 if not found
                }
            });

    @EventListener
    public void handleSessionConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String roomId = accessor.getFirstNativeHeader("roomId");
        String displayName = accessor.getFirstNativeHeader("displayName");
        String userId = accessor.getFirstNativeHeader("userId");
        String sessionId = accessor.getSessionId();

        if (roomId == null || displayName == null || userId == null || sessionId == null) {
            log.warn("Missing headers on connect.");
            return;
        }

        accessor.getSessionAttributes().put("roomId", roomId);
        accessor.getSessionAttributes().put("displayName", displayName);
        accessor.getSessionAttributes().put("userId", userId);
        
        String usersKey = "room:" + roomId + ":users";
        String userSessionsKey = "room:" + roomId + ":user:" + userId + ":sessions";
        
        try {
            int maxUsers = maxUsersCache.get(roomId);
            
            // Add session for user
            redisTemplate.opsForSet().add(userSessionsKey, sessionId);
            redisTemplate.expire(userSessionsKey, 24, TimeUnit.HOURS);
            
            // Add user to room
            redisTemplate.opsForSet().add(usersKey, userId);
            redisTemplate.expire(usersKey, 24, TimeUnit.HOURS);
            
            Long count = redisTemplate.opsForSet().size(usersKey);
            
            if (count != null && count > maxUsers) {
                // Reject logic
                redisTemplate.opsForSet().remove(userSessionsKey, sessionId);
                if (redisTemplate.opsForSet().size(userSessionsKey) == 0) {
                    redisTemplate.opsForSet().remove(usersKey, userId);
                }
                
                messagingTemplate.convertAndSendToUser(userId, "/queue/errors", 
                        new ErrorDTO("ROOM_FULL", "Room is full. Max users: " + maxUsers));
                accessor.getSessionAttributes().put("rejected", true);
                return;
            }
            
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/presence", 
                    new PresenceDTO("JOIN", displayName, count.intValue()));
                    
        } catch (ExecutionException e) {
            log.error("Failed to load maxUsers for room: {}", roomId, e);
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String roomId = (String) accessor.getSessionAttributes().get("roomId");
        String displayName = (String) accessor.getSessionAttributes().get("displayName");
        String userId = (String) accessor.getSessionAttributes().get("userId");
        String sessionId = accessor.getSessionId();
        Boolean rejected = (Boolean) accessor.getSessionAttributes().get("rejected");

        if (roomId != null && userId != null && sessionId != null && !Boolean.TRUE.equals(rejected)) {
            String usersKey = "room:" + roomId + ":users";
            String userSessionsKey = "room:" + roomId + ":user:" + userId + ":sessions";
            
            // Remove session
            redisTemplate.opsForSet().remove(userSessionsKey, sessionId);
            
            // If user has no more active sessions in this room, remove user from room
            Long remainingSessions = redisTemplate.opsForSet().size(userSessionsKey);
            if (remainingSessions == null || remainingSessions == 0) {
                redisTemplate.opsForSet().remove(usersKey, userId);
            }
            
            Long count = redisTemplate.opsForSet().size(usersKey);
            int currentCount = count != null ? count.intValue() : 0;
            
            if (currentCount <= 0) {
                roomRepository.findById(roomId).ifPresent(r -> {
                    r.setLastActiveAt(java.time.Instant.now());
                    roomRepository.save(r);
                });
            }
            
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/presence", 
                    new PresenceDTO("LEAVE", displayName, currentCount));
        }
    }

    @EventListener
    public void handleSessionSubscribe(org.springframework.web.socket.messaging.SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();
        
        if (destination != null && destination.startsWith("/topic/room/") && destination.endsWith("/presence")) {
            String[] parts = destination.split("/");
            if (parts.length >= 4) {
                String roomId = parts[3];
                String usersKey = "room:" + roomId + ":users";
                Long count = redisTemplate.opsForSet().size(usersKey);
                int currentCount = count != null ? count.intValue() : 0;
                
                // Broadcast a SYNC event to ensure the newly subscribed client gets the true current count
                messagingTemplate.convertAndSend(destination, 
                        new PresenceDTO("SYNC", "System", currentCount));
            }
        }
    }
}

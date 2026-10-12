package com.chatapp.service;

import com.chatapp.dto.PresenceDTO;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class RoomCleanupService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void cleanupInactiveRooms() {
        Instant cutoff = Instant.now().minus(60, ChronoUnit.MINUTES);
        
        List<com.chatapp.domain.Room> inactiveRooms = roomRepository.findByLastActiveAtBefore(cutoff);
        if (inactiveRooms.isEmpty()) {
            return;
        }

        List<String> expiredRoomIds = new ArrayList<>();
        int deletedCount = 0;
        for (com.chatapp.domain.Room room : inactiveRooms) {
            String usersKey = "room:" + room.getId() + ":users";
            Long count = redisTemplate.opsForSet().size(usersKey);
            int currentCount = count != null ? count.intValue() : 0;
            
            if (currentCount <= 0) {
                expiredRoomIds.add(room.getId());
                messageRepository.deleteAllByRoomIdIn(List.of(room.getId()));
                roomRepository.delete(room);
                redisTemplate.delete(usersKey);
                redisTemplate.delete("room:" + room.getId() + ":messages"); // optional cleanup of other keys
                deletedCount++;
            }
        }
        
        // Notify connected clients about expired rooms
        for (String expiredId : expiredRoomIds) {
            // Notify anyone still subscribed to this room's presence topic
            messagingTemplate.convertAndSend("/topic/room/" + expiredId + "/presence",
                    new PresenceDTO("ROOM_EXPIRED", "System", 0));
            // Notify all clients via the global expired topic so they can update their lists
            messagingTemplate.convertAndSend("/topic/rooms/expired",
                    new PresenceDTO("ROOM_EXPIRED", expiredId, 0));
        }

        if (deletedCount > 0) {
            log.info("Deleted {} empty inactive rooms", deletedCount);
        }
    }
}


package com.chatapp.service;

import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class RoomCleanupService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void cleanupInactiveRooms() {
        Instant cutoff = Instant.now().minus(60, ChronoUnit.MINUTES);
        
        List<com.chatapp.domain.Room> inactiveRooms = roomRepository.findByLastActiveAtBefore(cutoff);
        if (inactiveRooms.isEmpty()) {
            return;
        }

        int deletedCount = 0;
        for (com.chatapp.domain.Room room : inactiveRooms) {
            String usersKey = "room:" + room.getId() + ":users";
            Long count = redisTemplate.opsForSet().size(usersKey);
            int currentCount = count != null ? count.intValue() : 0;
            
            if (currentCount <= 0) {
                messageRepository.deleteAllByRoomIdIn(List.of(room.getId()));
                roomRepository.delete(room);
                redisTemplate.delete(usersKey);
                redisTemplate.delete("room:" + room.getId() + ":messages"); // optional cleanup of other keys
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            log.info("Deleted {} empty inactive rooms", deletedCount);
        }
    }
}


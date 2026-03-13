package com.chatapp.service;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.chatapp.domain.Room;
import com.chatapp.dto.RoomCreateRequest;
import com.chatapp.dto.RoomMetadataResponse;
import com.chatapp.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {

    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public Room createRoom(RoomCreateRequest request) {
        String roomId = NanoIdUtils.randomNanoId(new SecureRandom(), NanoIdUtils.DEFAULT_ALPHABET, 9);
        
        // Sanitize display name
        String sanitizedName = Jsoup.clean(request.displayName(), Safelist.none());

        String passwordHash = null;
        if (Boolean.TRUE.equals(request.isPrivate())) {
            if (request.password() == null || request.password().length() < 6) {
                throw new IllegalArgumentException("Password must be at least 6 characters for private rooms.");
            }
            passwordHash = passwordEncoder.encode(request.password());
        }

        Room room = Room.builder()
                .id(roomId)
                .isPrivate(request.isPrivate())
                .passwordHash(passwordHash)
                .maxUsers(request.maxUsers())
                .createdAt(Instant.now())
                .creatorUuid(request.creatorUuid())
                .displayName(sanitizedName)
                .lastActiveAt(Instant.now())
                .build();

        return roomRepository.save(room);
    }

    @Transactional(readOnly = true)
    public boolean validatePassword(String roomId, String password) {
        Room room = getRoomById(roomId);
        if (!room.getIsPrivate()) {
            return true; // Public rooms don't need password validation
        }
        if (room.getPasswordHash() == null) {
            return false;
        }
        return passwordEncoder.matches(password, room.getPasswordHash());
    }

    @Transactional(readOnly = true)
    public Room getRoomById(String roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found with ID: " + roomId));
    }
    
    @Transactional(readOnly = true)
    public RoomMetadataResponse getRoomMetadata(String roomId) {
        Room room = getRoomById(roomId);
        
        // Get active count from Redis Set
        String usersKey = "room:" + roomId + ":users";
        Long count = redisTemplate.opsForSet().size(usersKey);
        int activeCount = count != null ? count.intValue() : 0;
        
        return new RoomMetadataResponse(
            room.getId(),
            room.getDisplayName(),
            room.getIsPrivate(),
            room.getMaxUsers(),
            activeCount
        );
    }

    @Transactional(readOnly = true)
    public List<RoomMetadataResponse> getPublicRooms() {
        return roomRepository.findTop20ByIsPrivateFalseOrderByCreatedAtDesc().stream()
                .map(room -> {
                    String usersKey = "room:" + room.getId() + ":users";
                    Long count = redisTemplate.opsForSet().size(usersKey);
                    int activeCount = count != null ? count.intValue() : 0;
                    return new RoomMetadataResponse(
                        room.getId(),
                        room.getDisplayName(),
                        room.getIsPrivate(),
                        room.getMaxUsers(),
                        activeCount
                    );
                })
                .collect(Collectors.toList());
    }
}

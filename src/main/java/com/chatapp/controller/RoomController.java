package com.chatapp.controller;

import com.chatapp.domain.Room;
import com.chatapp.dto.RoomCreateRequest;
import com.chatapp.dto.RoomMetadataResponse;
import com.chatapp.dto.RoomResponse;
import com.chatapp.dto.RoomValidateRequest;
import com.chatapp.dto.MessageDTO;
import com.chatapp.dto.MessageMapper;
import com.chatapp.repository.MessageRepository;
import com.chatapp.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody RoomCreateRequest request) {
        Room room = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RoomResponse(room.getId(), "/room/" + room.getId()));
    }

    @PostMapping("/{roomId}/validate")
    public ResponseEntity<Void> validatePassword(
            @PathVariable String roomId,
            @Valid @RequestBody RoomValidateRequest request) {
        
        boolean isValid = roomService.validatePassword(roomId, request.password());
        if (isValid) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomMetadataResponse> getRoomMetadata(@PathVariable String roomId) {
        RoomMetadataResponse response = roomService.getRoomMetadata(roomId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/public")
    public ResponseEntity<List<RoomMetadataResponse>> getPublicRooms() {
        return ResponseEntity.ok(roomService.getPublicRooms());
    }

    @GetMapping("/{roomId}/history")
    public ResponseEntity<List<MessageDTO>> getRoomHistory(@PathVariable String roomId) {
        // Just verify room exists
        roomService.getRoomById(roomId);
        
        List<MessageDTO> history = messageRepository.findTop40ByRoomIdOrderByTimestampAsc(roomId)
                .stream()
                .map(messageMapper::toDto)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(history);
    }
}

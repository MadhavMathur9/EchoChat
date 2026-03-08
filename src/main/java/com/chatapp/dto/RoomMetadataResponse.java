package com.chatapp.dto;

public record RoomMetadataResponse(
    String roomId,
    String displayName,
    Boolean isPrivate,
    Integer maxUsers,
    Integer activeCount
) {}

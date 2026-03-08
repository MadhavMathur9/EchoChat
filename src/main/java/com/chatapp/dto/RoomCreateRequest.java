package com.chatapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RoomCreateRequest(
    @NotBlank
    @Size(min = 3, max = 50)
    String displayName,

    @NotNull
    Boolean isPrivate,

    String password,

    @NotNull
    @Min(2)
    @Max(50)
    Integer maxUsers,

    @NotBlank
    String creatorUuid
) {}

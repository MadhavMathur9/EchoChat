package com.chatapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RoomValidateRequest(
    @NotBlank
    @Size(min = 6)
    String password
) {}

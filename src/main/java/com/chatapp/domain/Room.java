package com.chatapp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    @Id
    @Column(length = 9, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private Boolean isPrivate;

    @Column
    private String passwordHash;

    @Column(nullable = false)
    private Integer maxUsers;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @Column(nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant lastActiveAt;

    @Column(nullable = false)
    private String creatorUuid;

    @Column(nullable = false, length = 50)
    private String displayName;
}

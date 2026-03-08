package com.chatapp.repository;

import com.chatapp.domain.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {
    void deleteAllByIdIn(List<String> ids);

    List<Room> findByLastActiveAtBefore(Instant cutoff);


    List<Room> findTop20ByIsPrivateFalseOrderByCreatedAtDesc();
}

package com.chatapp.repository;

import com.chatapp.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    
    @Query("SELECT m FROM Message m WHERE m.room.id = :roomId ORDER BY m.timestamp ASC LIMIT 40")
    List<Message> findTop40ByRoomIdOrderByTimestampAsc(@Param("roomId") String roomId);
    
    void deleteAllByRoomIdIn(List<String> roomIds);
}

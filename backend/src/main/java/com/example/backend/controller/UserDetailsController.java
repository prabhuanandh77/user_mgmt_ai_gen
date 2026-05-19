package com.example.backend.controller;

import com.example.backend.model.UserDetails;
import com.example.backend.service.UserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserDetailsController {

    private final UserDetailsService service;

    @Autowired
    public UserDetailsController(UserDetailsService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<UserDetails> addUser(@RequestBody UserDetails userDetails) {
        return ResponseEntity.ok(service.addUser(userDetails));
    }

    @GetMapping
    public ResponseEntity<List<UserDetails>> getUsers() {
        return ResponseEntity.ok(service.getAllUsers());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        service.deleteUser(id);
        return ResponseEntity.ok().build();
    }
}
